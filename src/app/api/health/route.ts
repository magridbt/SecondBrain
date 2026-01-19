import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {
    database: { status: 'error' },
    api: { status: 'ok' },
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

  const hasErrors = Object.values(checks).some((c) => c.status === 'error')

  return NextResponse.json(
    {
      status: hasErrors ? 'unhealthy' : 'healthy',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: hasErrors ? 503 : 200 }
  )
}
