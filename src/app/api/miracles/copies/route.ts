import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - List copies for a miracle
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const miracleId = searchParams.get('miracle_id')

    let query = supabase
      .from('miracle_copies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (miracleId) query = query.eq('miracle_id', miracleId)

    const { data: copies, error } = await query.limit(100)

    if (error) {
      console.error('Fetch copies error:', error)
      return NextResponse.json({ error: 'Failed to fetch copies' }, { status: 500 })
    }

    return NextResponse.json({ copies })
  } catch (error) {
    console.error('Copies GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE - Remove a copy
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const { error } = await supabase
      .from('miracle_copies')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Delete copy error:', error)
      return NextResponse.json({ error: 'Failed to delete copy' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Copies DELETE error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
