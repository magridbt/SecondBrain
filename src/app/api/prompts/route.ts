import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generalRateLimiter, getRateLimitHeaders } from '@/lib/ratelimit'
import { secureLog } from '@/lib/logger'

// Schema definitions
const PromptCreateSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name too long'),
  description: z.string().max(1000).optional().nullable(),
  system_prompt: z.string()
    .min(1, 'System prompt is required')
    .max(50000, 'System prompt too long'),
  icon: z.string().max(50).optional().default('sparkles'),
  color: z.string().max(50).optional().default('gold'),
  is_public: z.boolean().optional().default(false),
  conversation_starters: z.array(z.string().max(500)).max(10).optional().default([]),
})

const PromptUpdateSchema = z.object({
  id: z.string().uuid('Invalid prompt ID'),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  system_prompt: z.string().min(1).max(50000).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  is_public: z.boolean().optional(),
  is_active: z.boolean().optional(),
  conversation_starters: z.array(z.string().max(500)).max(10).optional(),
})

const PromptIdQuerySchema = z.object({
  id: z.string().uuid('Invalid prompt ID'),
})

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// GET - List user's prompts (and public prompts)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const { success, limit, remaining, reset } = await generalRateLimiter.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders({ limit, remaining, reset }) }
      )
    }

    const { searchParams } = new URL(request.url)
    const includePublic = searchParams.get('includePublic') !== 'false'

    // Build query
    let query = supabase
      .from('custom_prompts')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })

    if (includePublic) {
      query = query.or(`user_id.eq.${user.id},is_public.eq.true`)
    } else {
      query = query.eq('user_id', user.id)
    }

    const { data: prompts, error } = await query

    if (error) {
      secureLog('error', 'Fetch prompts error', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 })
    }

    // Mark which ones belong to the user
    const promptsWithOwnership = prompts?.map(p => ({
      ...p,
      is_owner: p.user_id === user.id
    })) || []

    return NextResponse.json(
      { prompts: promptsWithOwnership },
      { headers: getRateLimitHeaders({ limit, remaining, reset }) }
    )
  } catch (error) {
    secureLog('error', 'Prompts error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 })
  }
}

// POST - Create new prompt
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const { success, limit, remaining, reset } = await generalRateLimiter.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders({ limit, remaining, reset }) }
      )
    }

    // Parse and validate request body
    const rawBody = await request.json()
    const validation = PromptCreateSchema.safeParse(rawBody)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const body = validation.data
    const slug = generateSlug(body.name)

    const { data: prompt, error } = await supabase
      .from('custom_prompts')
      .insert({
        user_id: user.id,
        name: body.name,
        slug,
        description: body.description || null,
        system_prompt: body.system_prompt,
        icon: body.icon,
        color: body.color,
        is_public: body.is_public,
        conversation_starters: body.conversation_starters,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A prompt with this name already exists' }, { status: 400 })
      }
      secureLog('error', 'Create prompt error', { error: error.message })
      return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 })
    }

    secureLog('info', 'Prompt created', { userId: user.id, promptId: prompt.id })

    return NextResponse.json(
      { prompt },
      { headers: getRateLimitHeaders({ limit, remaining, reset }) }
    )
  } catch (error) {
    secureLog('error', 'Create prompt error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 })
  }
}

// PUT - Update prompt
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const { success, limit, remaining, reset } = await generalRateLimiter.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders({ limit, remaining, reset }) }
      )
    }

    // Parse and validate request body
    const rawBody = await request.json()
    const validation = PromptUpdateSchema.safeParse(rawBody)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...body } = validation.data

    // Build update object
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) {
      updates.name = body.name
      updates.slug = generateSlug(body.name)
    }
    if (body.description !== undefined) updates.description = body.description
    if (body.system_prompt !== undefined) updates.system_prompt = body.system_prompt
    if (body.icon !== undefined) updates.icon = body.icon
    if (body.color !== undefined) updates.color = body.color
    if (body.is_public !== undefined) updates.is_public = body.is_public
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.conversation_starters !== undefined) updates.conversation_starters = body.conversation_starters

    const { data: prompt, error } = await supabase
      .from('custom_prompts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns this prompt
      .select()
      .single()

    if (error) {
      secureLog('error', 'Update prompt error', { error: error.message })
      return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 })
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found or not owned by user' }, { status: 404 })
    }

    secureLog('info', 'Prompt updated', { userId: user.id, promptId: id })

    return NextResponse.json(
      { prompt },
      { headers: getRateLimitHeaders({ limit, remaining, reset }) }
    )
  } catch (error) {
    secureLog('error', 'Update prompt error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 })
  }
}

// DELETE - Delete prompt
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const { success, limit, remaining, reset } = await generalRateLimiter.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders({ limit, remaining, reset }) }
      )
    }

    const { searchParams } = new URL(request.url)
    const validation = PromptIdQuerySchema.safeParse({
      id: searchParams.get('id')
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid prompt ID', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { id } = validation.data

    const { error } = await supabase
      .from('custom_prompts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns this prompt

    if (error) {
      secureLog('error', 'Delete prompt error', { error: error.message })
      return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 })
    }

    secureLog('info', 'Prompt deleted', { userId: user.id, promptId: id })

    return NextResponse.json(
      { success: true },
      { headers: getRateLimitHeaders({ limit, remaining, reset }) }
    )
  } catch (error) {
    secureLog('error', 'Delete prompt error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 })
  }
}
