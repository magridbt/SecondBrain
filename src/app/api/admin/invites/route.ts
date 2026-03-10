import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getInviteEmailHtml, getInviteEmailText } from '@/emails/invite-email'
import { z } from 'zod'
import { adminRateLimiter, getRateLimitHeaders } from '@/lib/ratelimit'
import { secureLog } from '@/lib/logger'

// Schema definitions
const InviteCreateSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email too long'),
  moduleAccess: z.array(z.string()).optional().default([]),
})

const InviteIdQuerySchema = z.object({
  id: z.string().uuid('Invalid invite ID'),
})

// Lazy-load Resend client
let resend: Resend | null = null
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

// Helper function to check admin role
async function checkAdminAccess(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .single()

  return {
    isAdmin: !!profile && profile.role === 'admin',
    fullName: profile?.full_name,
  }
}

// POST - Create invite and send email
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { isAdmin, fullName } = await checkAdminAccess(supabase, user.id)
    if (!isAdmin) {
      secureLog('warn', 'Non-admin invite attempt', { userId: user.id })
      return NextResponse.json({ error: 'Only admins can send invites' }, { status: 403 })
    }

    // Rate limiting
    const { success, limit, remaining, reset } = await adminRateLimiter.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders({ limit, remaining, reset }) }
      )
    }

    // Parse and validate request body
    let rawBody: any
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const validation = InviteCreateSchema.safeParse(rawBody)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { email, moduleAccess } = validation.data

    // Check if email is already registered
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingProfile) {
      return NextResponse.json({ error: 'This email is already registered' }, { status: 400 })
    }

    // Check if there's a pending invite for this email
    const { data: existingInvite } = await supabase
      .from('invites')
      .select('id, token')
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      // Resend the existing invite
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${existingInvite.token}`
      await sendInviteEmail(email, inviteUrl, fullName)

      secureLog('info', 'Invite resent', { invitedEmail: email })

      return NextResponse.json({
        success: true,
        message: 'Invite resent successfully!',
        inviteUrl,
      }, { headers: getRateLimitHeaders({ limit, remaining, reset }) })
    }

    // Create new invite
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

    const { error: insertError } = await supabase
      .from('invites')
      .insert({
        email,
        token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        module_access: moduleAccess,
      })

    if (insertError) {
      secureLog('error', 'Invite insert error', { error: insertError.message })
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // Build invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`

    // Send email
    const emailResult = await sendInviteEmail(email, inviteUrl, fullName)

    secureLog('info', 'Invite created', { invitedEmail: email, emailSent: emailResult.success })

    if (!emailResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Invite created, but there was an error sending the email. Backup link:',
        inviteUrl,
        emailError: emailResult.error,
      }, { headers: getRateLimitHeaders({ limit, remaining, reset }) })
    }

    return NextResponse.json({
      success: true,
      message: 'Invite sent successfully!',
      inviteUrl,
    }, { headers: getRateLimitHeaders({ limit, remaining, reset }) })
  } catch (error) {
    secureLog('error', 'Invite error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}

// Helper function to send invite email
async function sendInviteEmail(
  toEmail: string,
  inviteUrl: string,
  invitedByName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resendClient = getResendClient()
    if (!resendClient) {
      return { success: false, error: 'Email service not configured' }
    }

    const { error } = await resendClient.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Sri AB Teachings <onboarding@resend.dev>',
      to: toEmail,
      subject: "You've been invited to Sri AB Teachings",
      html: getInviteEmailHtml({ inviteUrl, invitedByName }),
      text: getInviteEmailText({ inviteUrl, invitedByName }),
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// GET - List pending invites
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { isAdmin } = await checkAdminAccess(supabase, user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can view invites' }, { status: 403 })
    }

    // Rate limiting
    const { success, limit, remaining, reset } = await adminRateLimiter.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders({ limit, remaining, reset }) }
      )
    }

    const { data: invites, error } = await supabase
      .from('invites')
      .select(`
        id,
        email,
        token,
        expires_at,
        accepted_at,
        created_at,
        module_access,
        profiles:invited_by (
          full_name
        )
      `)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      secureLog('error', 'Fetch invites error', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
    }

    return NextResponse.json(
      { invites },
      { headers: getRateLimitHeaders({ limit, remaining, reset }) }
    )
  } catch (error) {
    secureLog('error', 'Invites error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
  }
}

// DELETE - Cancel/delete an invite
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { isAdmin } = await checkAdminAccess(supabase, user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can delete invites' }, { status: 403 })
    }

    // Rate limiting
    const { success, limit, remaining, reset } = await adminRateLimiter.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders({ limit, remaining, reset }) }
      )
    }

    const { searchParams } = new URL(request.url)
    const validation = InviteIdQuerySchema.safeParse({
      id: searchParams.get('id')
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid invite ID', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { id } = validation.data

    const { error } = await supabase
      .from('invites')
      .delete()
      .eq('id', id)

    if (error) {
      secureLog('error', 'Delete invite error', { error: error.message })
      return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 })
    }

    secureLog('info', 'Invite deleted', { inviteId: id })

    return NextResponse.json(
      { success: true },
      { headers: getRateLimitHeaders({ limit, remaining, reset }) }
    )
  } catch (error) {
    secureLog('error', 'Delete invite error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 })
  }
}
