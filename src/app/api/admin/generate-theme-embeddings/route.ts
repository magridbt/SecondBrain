import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateAllThemeEmbeddings } from '@/lib/theme-classifier'

// POST - Generate embeddings for all themes
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('Starting theme embeddings generation...')
    const result = await generateAllThemeEmbeddings()
    console.log('Theme embeddings generation complete:', result)

    return NextResponse.json({
      message: `Generated ${result.success} theme embeddings, ${result.failed} failed`,
      generated: result.success,
      failed: result.failed
    })
  } catch (error) {
    console.error('Error generating theme embeddings:', error)
    return NextResponse.json({ error: 'Failed to generate theme embeddings' }, { status: 500 })
  }
}

// GET - Check status of theme embeddings
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { data: themes, error } = await supabase
      .from('themes')
      .select('slug, name_en, embedding')
      .eq('is_active', true)
      .order('display_order')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 })
    }

    const withEmbedding = themes?.filter(t => t.embedding !== null).length || 0
    const withoutEmbedding = themes?.filter(t => t.embedding === null).length || 0

    return NextResponse.json({
      total: themes?.length || 0,
      withEmbedding,
      withoutEmbedding,
      themes: themes?.map(t => ({
        slug: t.slug,
        name: t.name_en,
        hasEmbedding: t.embedding !== null
      }))
    })
  } catch (error) {
    console.error('Error fetching theme status:', error)
    return NextResponse.json({ error: 'Failed to fetch theme status' }, { status: 500 })
  }
}
