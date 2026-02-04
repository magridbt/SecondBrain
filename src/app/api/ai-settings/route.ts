import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { encryptKey, decryptKey, maskKey } from '@/lib/encryption'
import { z } from 'zod'
import { generalRateLimiter, getRateLimitHeaders } from '@/lib/ratelimit'
import { secureLog } from '@/lib/logger'

// Schema definitions
const AIProviderSchema = z.enum(['claude', 'chatgpt', 'gemini'])

const AISettingsUpdateSchema = z.object({
  anthropic_api_key: z.string().optional().nullable(),
  openai_api_key: z.string().optional().nullable(),
  gemini_api_key: z.string().optional().nullable(),
  default_provider: AIProviderSchema.optional(),
  claude_model: z.string().max(100).optional(),
  openai_model: z.string().max(100).optional(),
  gemini_model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(100).max(8000).optional(),
})

const AISettingsDeleteQuerySchema = z.object({
  key: z.enum(['anthropic', 'openai', 'gemini']),
})

// Available models for each provider
const AI_MODELS = {
  claude: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Balanced performance and speed' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable model' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Previous generation' },
  ],
  chatgpt: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest multimodal model' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous flagship' },
  ],
  gemini: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable Gemini' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and efficient' },
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Balanced model' },
  ],
}

const DEFAULT_SETTINGS = {
  default_provider: 'claude' as const,
  claude_model: 'claude-sonnet-4-20250514',
  openai_model: 'gpt-4o',
  gemini_model: 'gemini-1.5-pro',
  temperature: 0.7,
  max_tokens: 1500,
}

// GET - Retrieve user's AI settings
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

    const { data: settings, error } = await supabase
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      secureLog('error', 'Failed to fetch AI settings', { userId: user.id })
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    const response = {
      settings: settings ? {
        ...settings,
        anthropic_api_key: settings.anthropic_api_key ? maskKey(decryptKey(settings.anthropic_api_key)) : null,
        openai_api_key: settings.openai_api_key ? maskKey(decryptKey(settings.openai_api_key)) : null,
        gemini_api_key: settings.gemini_api_key ? maskKey(decryptKey(settings.gemini_api_key)) : null,
        has_anthropic_key: !!settings.anthropic_api_key,
        has_openai_key: !!settings.openai_api_key,
        has_gemini_key: !!settings.gemini_api_key,
      } : null,
      models: AI_MODELS,
      defaults: DEFAULT_SETTINGS,
    }

    return NextResponse.json(response, {
      headers: getRateLimitHeaders({ limit, remaining, reset })
    })
  } catch (error) {
    secureLog('error', 'GET settings error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update AI settings
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
    const validation = AISettingsUpdateSchema.safeParse(rawBody)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const body = validation.data

    // Check if settings exist
    const { data: existing } = await supabase
      .from('user_ai_settings')
      .select('id, anthropic_api_key, openai_api_key, gemini_api_key')
      .eq('user_id', user.id)
      .single()

    // Prepare update data
    const updateData: Record<string, unknown> = {
      user_id: user.id,
      default_provider: body.default_provider ?? DEFAULT_SETTINGS.default_provider,
      claude_model: body.claude_model ?? DEFAULT_SETTINGS.claude_model,
      openai_model: body.openai_model ?? DEFAULT_SETTINGS.openai_model,
      gemini_model: body.gemini_model ?? DEFAULT_SETTINGS.gemini_model,
      temperature: body.temperature ?? DEFAULT_SETTINGS.temperature,
      max_tokens: body.max_tokens ?? DEFAULT_SETTINGS.max_tokens,
    }

    // Only update API keys if they're actual new values (not masked)
    if (body.anthropic_api_key && !body.anthropic_api_key.includes('••••')) {
      updateData.anthropic_api_key = encryptKey(body.anthropic_api_key)
    } else if (existing?.anthropic_api_key) {
      updateData.anthropic_api_key = existing.anthropic_api_key
    }

    if (body.openai_api_key && !body.openai_api_key.includes('••••')) {
      updateData.openai_api_key = encryptKey(body.openai_api_key)
    } else if (existing?.openai_api_key) {
      updateData.openai_api_key = existing.openai_api_key
    }

    if (body.gemini_api_key && !body.gemini_api_key.includes('••••')) {
      updateData.gemini_api_key = encryptKey(body.gemini_api_key)
    } else if (existing?.gemini_api_key) {
      updateData.gemini_api_key = existing.gemini_api_key
    }

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('user_ai_settings')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('user_ai_settings')
        .insert(updateData)
        .select()
        .single()

      if (error) throw error
      result = data
    }

    secureLog('info', 'AI settings updated', { userId: user.id })

    return NextResponse.json({
      success: true,
      settings: {
        ...result,
        anthropic_api_key: result.anthropic_api_key ? maskKey(decryptKey(result.anthropic_api_key)) : null,
        openai_api_key: result.openai_api_key ? maskKey(decryptKey(result.openai_api_key)) : null,
        gemini_api_key: result.gemini_api_key ? maskKey(decryptKey(result.gemini_api_key)) : null,
        has_anthropic_key: !!result.anthropic_api_key,
        has_openai_key: !!result.openai_api_key,
        has_gemini_key: !!result.gemini_api_key,
      }
    }, { headers: getRateLimitHeaders({ limit, remaining, reset }) })
  } catch (error) {
    secureLog('error', 'POST settings error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

// DELETE - Remove a specific API key
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
    const queryValidation = AISettingsDeleteQuerySchema.safeParse({
      key: searchParams.get('key')
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid key type. Must be: anthropic, openai, or gemini' },
        { status: 400 }
      )
    }

    const { key: keyType } = queryValidation.data

    const updateData: Record<string, null> = {}
    updateData[`${keyType}_api_key`] = null

    const { error } = await supabase
      .from('user_ai_settings')
      .update(updateData)
      .eq('user_id', user.id)

    if (error) throw error

    secureLog('info', 'API key removed', { userId: user.id, keyType })

    return NextResponse.json(
      { success: true, message: `${keyType} API key removed` },
      { headers: getRateLimitHeaders({ limit, remaining, reset }) }
    )
  } catch (error) {
    secureLog('error', 'DELETE key error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to remove key' }, { status: 500 })
  }
}
