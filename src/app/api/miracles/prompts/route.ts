import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - List prompts (optionally filter by target_network)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const network = searchParams.get('network')

    let query = supabase
      .from('miracle_prompts')
      .select('*')
      .or(`user_id.eq.${user.id},is_default.eq.true`)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (network) query = query.eq('target_network', network)

    const { data: prompts, error } = await query

    if (error) {
      console.error('Fetch prompts error:', error)
      return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 })
    }

    return NextResponse.json({ prompts })
  } catch (error) {
    console.error('Prompts GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST - Create prompt
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, target_network, system_prompt } = await request.json()

    if (!name || !target_network || !system_prompt) {
      return NextResponse.json({ error: 'Nome, rede social e prompt são obrigatórios' }, { status: 400 })
    }

    const { data: prompt, error } = await supabase
      .from('miracle_prompts')
      .insert({
        user_id: user.id,
        name: name.trim(),
        target_network,
        system_prompt: system_prompt.trim(),
        is_default: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Create prompt error:', error)
      return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 })
    }

    return NextResponse.json({ prompt })
  } catch (error) {
    console.error('Prompts POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH - Update prompt
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, name, target_network, system_prompt } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name.trim()
    if (target_network !== undefined) updates.target_network = target_network
    if (system_prompt !== undefined) updates.system_prompt = system_prompt.trim()

    const { error } = await supabase
      .from('miracle_prompts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Update prompt error:', error)
      return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Prompts PATCH error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE - Remove prompt
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const { error } = await supabase
      .from('miracle_prompts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Delete prompt error:', error)
      return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Prompts DELETE error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
