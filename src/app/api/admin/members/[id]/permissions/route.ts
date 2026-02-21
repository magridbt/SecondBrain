import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return user
}

// GET - Return all modules with the member's access level
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params
    const supabase = await createClient()
    const admin = await checkAdmin(supabase)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    const { data: modules, error: modError } = await adminClient
      .from('modules')
      .select('id, name, slug, icon, is_active')
      .eq('is_active', true)
      .order('name')

    if (modError) {
      return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
    }

    const { data: userMods, error: umError } = await adminClient
      .from('user_modules')
      .select('module_id, role')
      .eq('user_id', memberId)

    if (umError) {
      return NextResponse.json({ error: 'Failed to fetch user modules' }, { status: 500 })
    }

    const userModMap = new Map(userMods?.map(um => [um.module_id, um.role]) || [])

    const result = modules?.map(m => ({
      module_id: m.id,
      name: m.name,
      slug: m.slug,
      icon: m.icon,
      enabled: userModMap.has(m.id),
      role: userModMap.get(m.id) || null,
    })) || []

    return NextResponse.json({ modules: result })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PUT - Update member's module permissions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params
    const supabase = await createClient()
    const admin = await checkAdmin(supabase)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { modules } = body as { modules: { module_id: string; enabled: boolean; role: string }[] }

    if (!Array.isArray(modules)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Delete all existing user_modules for this member
    await adminClient
      .from('user_modules')
      .delete()
      .eq('user_id', memberId)

    // Insert enabled modules
    const enabledModules = modules.filter(m => m.enabled && m.role)
    if (enabledModules.length > 0) {
      const { error } = await adminClient
        .from('user_modules')
        .insert(
          enabledModules.map(m => ({
            user_id: memberId,
            module_id: m.module_id,
            role: m.role,
          }))
        )

      if (error) {
        return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
