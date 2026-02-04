import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Get public prompt by slug
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient()
    const { slug } = params

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    // Get public prompt by slug
    const { data: prompt, error } = await supabase
      .from('custom_prompts')
      .select(`
        id,
        name,
        slug,
        description,
        system_prompt,
        icon,
        color,
        is_public,
        conversation_starters,
        usage_count,
        created_at,
        profiles:user_id (
          full_name
        )
      `)
      .eq('slug', slug)
      .eq('is_public', true)
      .eq('is_active', true)
      .single()

    if (error || !prompt) {
      return NextResponse.json({ error: 'Prompt not found or not public' }, { status: 404 })
    }

    return NextResponse.json({ prompt })
  } catch (error) {
    console.error('Public prompt error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    )
  }
}
