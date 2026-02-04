'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Settings,
  Key,
  Cpu,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Brain,
  Save,
  BadgeCheck,
  AlertTriangle,
} from 'lucide-react'
import { AI_PROVIDERS, DEFAULT_AI_SETTINGS, type AIProvider } from '@/config/ai-models'

interface AISettings {
  id?: string
  anthropic_api_key: string
  openai_api_key: string
  gemini_api_key: string
  default_provider: 'claude' | 'chatgpt' | 'gemini'
  claude_model: string
  openai_model: string
  gemini_model: string
  temperature: number
  max_tokens: number
}

// Map provider IDs to settings fields and styling
const PROVIDER_CONFIG: Record<string, {
  icon: any
  color: string
  bgColor: string
  borderColor: string
  keyField: 'anthropic_api_key' | 'openai_api_key' | 'gemini_api_key'
  modelField: 'claude_model' | 'openai_model' | 'gemini_model'
}> = {
  claude: {
    icon: Sparkles,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    keyField: 'anthropic_api_key',
    modelField: 'claude_model',
  },
  chatgpt: {
    icon: Zap,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    keyField: 'openai_api_key',
    modelField: 'openai_model',
  },
  gemini: {
    icon: Brain,
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    keyField: 'gemini_api_key',
    modelField: 'gemini_model',
  },
}

export default function DailyTeachingSettingsPage() {
  const [settings, setSettings] = useState<AISettings>({
    anthropic_api_key: '',
    openai_api_key: '',
    gemini_api_key: '',
    default_provider: DEFAULT_AI_SETTINGS.default_provider,
    claude_model: DEFAULT_AI_SETTINGS.claude_model,
    openai_model: DEFAULT_AI_SETTINGS.openai_model,
    gemini_model: DEFAULT_AI_SETTINGS.gemini_model,
    temperature: DEFAULT_AI_SETTINGS.temperature,
    max_tokens: DEFAULT_AI_SETTINGS.max_tokens,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({})

  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_ai_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setSettings({
          id: data.id,
          anthropic_api_key: data.anthropic_api_key || '',
          openai_api_key: data.openai_api_key || '',
          gemini_api_key: data.gemini_api_key || '',
          default_provider: data.default_provider || 'claude',
          claude_model: data.claude_model || 'claude-sonnet-4-20250514',
          openai_model: data.openai_model || 'gpt-4o',
          gemini_model: data.gemini_model || 'gemini-1.5-pro',
          temperature: data.temperature || 0.7,
          max_tokens: data.max_tokens || 1500,
        })
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const settingsData = {
        user_id: user.id,
        anthropic_api_key: settings.anthropic_api_key || null,
        openai_api_key: settings.openai_api_key || null,
        gemini_api_key: settings.gemini_api_key || null,
        default_provider: settings.default_provider,
        claude_model: settings.claude_model,
        openai_model: settings.openai_model,
        gemini_model: settings.gemini_model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
      }

      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('user_ai_settings')
          .update(settingsData)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('user_ai_settings')
          .insert(settingsData)
          .select()
          .single()

        if (error) throw error
        if (data) setSettings(prev => ({ ...prev, id: data.id }))
      }

      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const testApiKey = async (providerId: string) => {
    setTestingProvider(providerId)
    setTestResults(prev => ({ ...prev, [providerId]: null }))

    try {
      const response = await fetch('/api/daily-teaching/test-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          apiKey: providerId === 'claude' ? settings.anthropic_api_key :
                  providerId === 'chatgpt' ? settings.openai_api_key :
                  settings.gemini_api_key,
          model: providerId === 'claude' ? settings.claude_model :
                 providerId === 'chatgpt' ? settings.openai_model :
                 settings.gemini_model,
        }),
      })

      const result = await response.json()
      setTestResults(prev => ({
        ...prev,
        [providerId]: response.ok ? 'success' : 'error'
      }))
    } catch (err) {
      setTestResults(prev => ({ ...prev, [providerId]: 'error' }))
    } finally {
      setTestingProvider(null)
    }
  }

  const toggleShowKey = (field: string) => {
    setShowKeys(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const getProviderHasKey = (providerId: string) => {
    switch (providerId) {
      case 'claude': return !!settings.anthropic_api_key
      case 'chatgpt': return !!settings.openai_api_key
      case 'gemini': return !!settings.gemini_api_key
      default: return false
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-sage-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-sage-400 to-sage-600 rounded-2xl">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            AI Provider Settings
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Configure your AI providers and API keys
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500" />
          <span className="text-green-700 dark:text-green-400">{success}</span>
        </div>
      )}

      {/* Default Provider Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Default AI Provider
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AI_PROVIDERS.map(provider => {
            const config = PROVIDER_CONFIG[provider.id]
            const Icon = config.icon
            const isSelected = settings.default_provider === provider.id
            const hasKey = getProviderHasKey(provider.id)

            return (
              <button
                key={provider.id}
                onClick={() => setSettings(prev => ({ ...prev, default_provider: provider.id as any }))}
                disabled={!hasKey}
                className={`
                  relative p-4 rounded-xl border-2 transition-all text-left
                  ${isSelected
                    ? `${config.borderColor} ${config.bgColor} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-current`
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                  ${!hasKey ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {provider.fullName}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                )}
                {!hasKey && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add API key to enable
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* API Keys Configuration */}
      <div className="space-y-6">
        {AI_PROVIDERS.map(provider => {
          const config = PROVIDER_CONFIG[provider.id]
          const Icon = config.icon
          const keyValue = settings[config.keyField]
          const showKey = showKeys[config.keyField]
          const testResult = testResults[provider.id]

          return (
            <div
              key={provider.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl border ${config.borderColor} p-6`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {provider.fullName}
                    </h3>
                    <a
                      href={provider.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Get your API key →
                    </a>
                  </div>
                </div>
                {keyValue && (
                  <button
                    onClick={() => testApiKey(provider.id)}
                    disabled={testingProvider === provider.id}
                    className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition flex items-center gap-2"
                  >
                    {testingProvider === provider.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : testResult === 'success' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : testResult === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Test
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* API Key Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Key className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={keyValue}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        [config.keyField]: e.target.value
                      }))}
                      placeholder={`${provider.keyPrefix}...`}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-400 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(config.keyField)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Model
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Cpu className="w-4 h-4 text-gray-400" />
                    </div>
                    <select
                      value={settings[config.modelField]}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        [config.modelField]: e.target.value
                      }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-400 focus:border-transparent appearance-none"
                    >
                      {provider.models.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} {model.isDefault ? '(Recommended)' : ''} {model.isNew ? '✨ New' : ''} {model.isDeprecated ? '⚠️' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {provider.models.find(m => m.id === settings[config.modelField])?.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Advanced Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Advanced Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Temperature: {settings.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                temperature: parseFloat(e.target.value)
              }))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sage-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Tokens: {settings.max_tokens}
            </label>
            <input
              type="range"
              min="100"
              max="8000"
              step="100"
              value={settings.max_tokens}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                max_tokens: parseInt(e.target.value)
              }))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sage-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Short</span>
              <span>Long</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-sage-500 to-sage-400 hover:from-sage-600 hover:to-sage-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-sage"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
