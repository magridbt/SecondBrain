import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - List miracles
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const source = searchParams.get('source')
    const search = searchParams.get('search')

    let query = supabase
      .from('miracles')
      .select('*')
      .eq('user_id', user.id)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (source) query = query.eq('source_network', source)
    if (search) query = query.ilike('content', `%${search}%`)

    const { data: miracles, error } = await query

    if (error) {
      console.error('Fetch miracles error:', error)
      return NextResponse.json({ error: 'Failed to fetch miracles' }, { status: 500 })
    }

    return NextResponse.json({ miracles })
  } catch (error) {
    console.error('Miracles GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST - Create miracle
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const { title, content, source_network, tags } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Conteúdo do milagre é obrigatório' }, { status: 400 })
    }

    if (!source_network) {
      return NextResponse.json({ error: 'Rede social de origem é obrigatória' }, { status: 400 })
    }

    const { data: miracle, error } = await supabase
      .from('miracles')
      .insert({
        user_id: user.id,
        title: title?.trim() || '',
        content: content.trim(),
        source_network,
        tags: tags || [],
      })
      .select()
      .single()

    if (error) {
      console.error('Create miracle error:', error)
      return NextResponse.json({ error: 'Failed to create miracle' }, { status: 500 })
    }

    return NextResponse.json({ miracle })
  } catch (error) {
    console.error('Miracles POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH - Update miracle
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let patchBody: any
    try {
      patchBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const { id, title, content, source_network, tags } = patchBody
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title.trim()
    if (content !== undefined) updates.content = content.trim()
    if (source_network !== undefined) updates.source_network = source_network
    if (tags !== undefined) updates.tags = tags

    const { error } = await supabase
      .from('miracles')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Update miracle error:', error)
      return NextResponse.json({ error: 'Failed to update miracle' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Miracles PATCH error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE - Soft delete (archive) miracle — keeps data in DB, hides from UI
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const { error } = await supabase
      .from('miracles')
      .update({ archived: true })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Archive miracle error:', error)
      return NextResponse.json({ error: 'Failed to archive miracle' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Miracles DELETE error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
