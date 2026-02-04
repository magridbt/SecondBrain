import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { logAuditAction } from '@/lib/audit'
import { authRateLimiter, getRateLimitHeaders } from '@/lib/ratelimit'
import { secureLog } from '@/lib/logger'

// POST - Create/update session on login
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const { success, limit, remaining, reset } = await authRateLimiter.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders({ limit, remaining, reset }) }
      )
    }

    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const forwardedFor = headersList.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0] || headersList.get('x-real-ip') || 'unknown'

    // Create new session using user's client (RLS allows user to insert own sessions)
    const { data: session, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        messages_sent: 0,
        documents_uploaded: 0,
      })
      .select('id')
      .single()

    if (error) {
      // Log but don't fail - session tracking is optional
      secureLog('warn', 'Session creation error', { error: error.message })
    }

    // Log login action
    await logAuditAction({
      userId: user.id,
      userEmail: user.email,
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      details: {
        sessionId: session?.id,
      },
      ipAddress,
      userAgent,
    })

    secureLog('info', 'User login', { userId: user.id })

    return NextResponse.json(
      { success: true, sessionId: session?.id },
      { headers: getRateLimitHeaders({ limit, remaining, reset }) }
    )
  } catch (error) {
    secureLog('error', 'Session error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - End session on logout
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const { success, limit, remaining, reset } = await authRateLimiter.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders({ limit, remaining, reset }) }
      )
    }

    // End most recent session for this user (RLS allows user to update own sessions)
    const { error } = await supabase
      .from('user_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)

    if (error) {
      secureLog('warn', 'Session end error', { error: error.message })
    }

    // Log logout action
    await logAuditAction({
      userId: user.id,
      userEmail: user.email,
      action: 'logout',
      entityType: 'user',
      entityId: user.id,
    })

    secureLog('info', 'User logout', { userId: user.id })

    return NextResponse.json(
      { success: true },
      { headers: getRateLimitHeaders({ limit, remaining, reset }) }
    )
  } catch (error) {
    secureLog('error', 'Logout error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
