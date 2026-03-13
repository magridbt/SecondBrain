import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — retorna todas as configurações de sistema (público para leitura de branding)
export async function GET() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('system_settings')
      .select('key, value')

    if (error) {
      return NextResponse.json({ settings: {} }, { status: 200 })
    }

    const settings: Record<string, string> = {}
    for (const row of data ?? []) {
      settings[row.key] = row.value
    }

    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ settings: {} }, { status: 200 })
  }
}

// PUT — upsert de uma ou mais configurações (apenas admin)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as Record<string, string>
    const adminClient = createAdminClient()

    const rows = Object.entries(body).map(([key, value]) => ({ key, value: String(value) }))

    const { error } = await adminClient
      .from('system_settings')
      .upsert(rows, { onConflict: 'key' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
