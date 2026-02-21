import Anthropic from '@anthropic-ai/sdk'
import { trackTokenUsageWithRetry } from '@/lib/token-tracking'

interface AIResponse {
  text: string
  model: string
  provider: string
  inputTokens: number
  outputTokens: number
}

interface AICallParams {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  userId: string
  endpoint?: string
  preferredProvider?: 'claude' | 'chatgpt' | 'gemini'
}

const FALLBACK_ORDER = ['claude', 'chatgpt', 'gemini'] as const

async function callClaude(params: AICallParams): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')
  const anthropic = new Anthropic({ apiKey })
  const model = 'claude-sonnet-4-20250514'

  const response = await anthropic.messages.create({
    model,
    max_tokens: params.maxTokens || 2000,
    system: params.systemPrompt,
    messages: [{ role: 'user', content: params.userMessage }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  return {
    text,
    model,
    provider: 'claude',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}

async function callChatGPT(params: AICallParams): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key not configured')

  const model = 'gpt-4o'
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxTokens || 2000,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`)

  const data = await response.json()
  return {
    text: data.choices[0]?.message?.content || '',
    model,
    provider: 'chatgpt',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  }
}

async function callGemini(params: AICallParams): Promise<AIResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('Google AI API key not configured')

  const model = 'gemini-1.5-pro'
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.systemPrompt }] },
        contents: [{ parts: [{ text: params.userMessage }] }],
        generationConfig: { maxOutputTokens: params.maxTokens || 2000 },
      }),
      signal: AbortSignal.timeout(30000),
    }
  )

  if (!response.ok) throw new Error(`Gemini error: ${response.status}`)

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const usage = data.usageMetadata || {}

  return {
    text,
    model,
    provider: 'gemini',
    inputTokens: usage.promptTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || 0,
  }
}

const PROVIDER_MAP = {
  claude: callClaude,
  chatgpt: callChatGPT,
  gemini: callGemini,
} as const

export async function callAIWithFallback(params: AICallParams): Promise<AIResponse> {
  const preferred = params.preferredProvider || 'claude'

  // Build order: preferred first, then fallbacks
  const order = [preferred, ...FALLBACK_ORDER.filter(p => p !== preferred)]
  const errors: string[] = []

  for (const provider of order) {
    try {
      const result = await PROVIDER_MAP[provider](params)

      // Track token usage with retry (fire-and-forget)
      trackTokenUsageWithRetry({
        userId: params.userId,
        model: result.model,
        provider: result.provider as 'claude' | 'chatgpt' | 'gemini' | 'voyage',
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        endpoint: params.endpoint,
      })

      return result
    } catch (error: any) {
      const msg = `${provider}: ${error?.message || 'unknown error'}`
      errors.push(msg)
      console.warn(`AI fallback - ${msg}, trying next...`)
      continue
    }
  }

  throw new Error(`All AI providers failed: ${errors.join(' | ')}`)
}
