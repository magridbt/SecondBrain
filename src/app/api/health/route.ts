import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {
    database: { status: 'error' },
    api: { status: 'ok' },
    anthropic: { status: 'unknown' },
  }

  // Check Database
  try {
    const start = Date.now()
    const supabase = await createClient()
    await supabase.from('profiles').select('count').limit(1)
    checks.database = { status: 'ok', latencyMs: Date.now() - start }
  } catch (error) {
    checks.database = { status: 'error', error: (error as Error).message }
  }

  // Check Anthropic API key configured
  checks.anthropic = process.env.ANTHROPIC_API_KEY
    ? { status: 'ok' }
    : { status: 'error', error: 'ANTHROPIC_API_KEY not configured' }

  const hasErrors = Object.values(checks).some((c) => c.status === 'error')

  return NextResponse.json(
    {
      status: hasErrors ? 'unhealthy' : 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    },
    {
      status: hasErrors ? 503 : 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  )
}
