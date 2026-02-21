import { createAdminClient } from '@/lib/supabase/server'

// Cost per 1K tokens (USD) - updated Feb 2026
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-opus-4-20250514': { input: 0.015, output: 0.075 },
  'claude-haiku-3.5': { input: 0.00025, output: 0.00125 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'voyage-2': { input: 0.0001, output: 0 },
}

interface TrackTokenParams {
  userId: string
  model: string
  provider: 'claude' | 'chatgpt' | 'gemini' | 'voyage'
  inputTokens: number
  outputTokens: number
  endpoint?: string
  metadata?: Record<string, any>
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || { input: 0.003, output: 0.015 }
  return (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output
}

export async function trackTokenUsage(params: TrackTokenParams): Promise<void> {
  const adminClient = createAdminClient()
  const cost = calculateCost(params.model, params.inputTokens, params.outputTokens)

  try {
    await adminClient.from('token_usage').insert({
      user_id: params.userId,
      model: params.model,
      provider: params.provider,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      cost_usd: cost,
      endpoint: params.endpoint || null,
      metadata: params.metadata || {},
    })
  } catch (error) {
    console.error('Token tracking error:', error)
  }
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

export function trackTokenUsageWithRetry(params: TrackTokenParams): void {
  let attempt = 0
  const tryTrack = () => {
    attempt++
    trackTokenUsage(params).catch((error) => {
      if (attempt < MAX_RETRIES) {
        setTimeout(tryTrack, RETRY_DELAY_MS * attempt)
      } else {
        console.error(`Token tracking failed after ${MAX_RETRIES} retries:`, error)
      }
    })
  }
  tryTrack()
}

interface UsageSummary {
  totalTokens: number
  totalCost: number
  requestCount: number
}

export async function getUserUsage(userId: string, period: 'day' | 'month'): Promise<UsageSummary> {
  const adminClient = createAdminClient()

  try {
    const { data, error } = await adminClient.rpc('get_user_token_usage', {
      p_user_id: userId,
      p_period: period,
    })

    if (error || !data || data.length === 0) {
      return { totalTokens: 0, totalCost: 0, requestCount: 0 }
    }

    return {
      totalTokens: Number(data[0].total_tokens) || 0,
      totalCost: Number(data[0].total_cost) || 0,
      requestCount: Number(data[0].request_count) || 0,
    }
  } catch (error) {
    console.error('Get usage error:', error)
    return { totalTokens: 0, totalCost: 0, requestCount: 0 }
  }
}

export async function checkUsageLimit(userId: string, userRole: string = 'member'): Promise<{
  allowed: boolean
  reason?: string
  dailyUsage?: UsageSummary
  monthlyUsage?: UsageSummary
}> {
  const adminClient = createAdminClient()

  try {
    const { data: limits } = await adminClient
      .from('usage_limits')
      .select('*')
      .eq('role', userRole)
      .single()

    if (!limits) {
      return { allowed: true }
    }

    const [dailyUsage, monthlyUsage] = await Promise.all([
      getUserUsage(userId, 'day'),
      getUserUsage(userId, 'month'),
    ])

    if (dailyUsage.totalTokens >= limits.daily_token_limit) {
      return {
        allowed: false,
        reason: `Limite diario de tokens atingido (${limits.daily_token_limit.toLocaleString()} tokens)`,
        dailyUsage,
        monthlyUsage,
      }
    }

    if (dailyUsage.requestCount >= limits.daily_request_limit) {
      return {
        allowed: false,
        reason: `Limite diario de requisicoes atingido (${limits.daily_request_limit} requisicoes)`,
        dailyUsage,
        monthlyUsage,
      }
    }

    if (monthlyUsage.totalTokens >= limits.monthly_token_limit) {
      return {
        allowed: false,
        reason: `Limite mensal de tokens atingido (${limits.monthly_token_limit.toLocaleString()} tokens)`,
        dailyUsage,
        monthlyUsage,
      }
    }

    return { allowed: true, dailyUsage, monthlyUsage }
  } catch (error) {
    console.error('Check usage limit error:', error)
    return { allowed: true }
  }
}
