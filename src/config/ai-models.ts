/**
 * AI Models Configuration
 *
 * This file centralizes all AI provider models.
 * When new models are released, just add them here and they'll
 * automatically appear in all settings pages.
 *
 * Last updated: 2026-01-21
 */

export interface AIModel {
  id: string
  name: string
  description: string
  isDefault?: boolean
  isNew?: boolean        // Show "New" badge
  isDeprecated?: boolean // Show warning
}

export interface AIProvider {
  id: 'claude' | 'chatgpt' | 'gemini'
  name: string
  fullName: string
  keyPrefix: string
  keyUrl: string
  models: AIModel[]
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'claude',
    name: 'Claude',
    fullName: 'Claude (Anthropic)',
    keyPrefix: 'sk-ant-',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        description: 'Best balance of speed and intelligence',
        isDefault: true,
      },
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        description: 'Most capable, best for complex tasks',
        isNew: true,
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'Previous generation, still excellent',
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        description: 'Fast and affordable',
      },
    ],
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    fullName: 'ChatGPT (OpenAI)',
    keyPrefix: 'sk-',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Latest multimodal flagship model',
        isDefault: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast, affordable, great for most tasks',
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Previous flagship model',
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Legacy model, very fast',
        isDeprecated: true,
      },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    fullName: 'Gemini (Google)',
    keyPrefix: 'AIza',
    keyUrl: 'https://aistudio.google.com/apikey',
    models: [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Most capable Gemini model',
        isDefault: true,
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast and efficient',
      },
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        description: 'Experimental next-gen model',
        isNew: true,
      },
    ],
  },
]

// Helper functions
export function getProvider(providerId: string): AIProvider | undefined {
  return AI_PROVIDERS.find(p => p.id === providerId)
}

export function getDefaultModel(providerId: string): string {
  const provider = getProvider(providerId)
  const defaultModel = provider?.models.find(m => m.isDefault)
  return defaultModel?.id || provider?.models[0]?.id || ''
}

export function getModelName(providerId: string, modelId: string): string {
  const provider = getProvider(providerId)
  const model = provider?.models.find(m => m.id === modelId)
  return model?.name || modelId
}

export function getAllModels(providerId: string): AIModel[] {
  const provider = getProvider(providerId)
  return provider?.models || []
}

// Default settings
export const DEFAULT_AI_SETTINGS = {
  default_provider: 'claude' as const,
  claude_model: getDefaultModel('claude'),
  openai_model: getDefaultModel('chatgpt'),
  gemini_model: getDefaultModel('gemini'),
  temperature: 0.7,
  max_tokens: 1500,
}
