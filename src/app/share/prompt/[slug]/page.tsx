'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Sparkles,
  Heart,
  Brain,
  Share2,
  Star,
  MessageSquare,
  BookOpen,
  Lightbulb,
  Target,
  Flame,
  Feather,
  Zap,
  Loader2,
  Copy,
  Check,
  Plus,
  MessageCircle,
  User,
  ArrowRight,
} from 'lucide-react'

interface SharedPrompt {
  id: string
  name: string
  slug: string
  description: string
  system_prompt: string
  icon: string
  color: string
  is_public: boolean
  conversation_starters: string[]
  usage_count: number
  created_at: string
  profiles: {
    full_name: string
  } | null
}

const ICONS: Record<string, any> = {
  'sparkles': Sparkles,
  'heart': Heart,
  'brain': Brain,
  'share-2': Share2,
  'star': Star,
  'message-square': MessageSquare,
  'book-open': BookOpen,
  'lightbulb': Lightbulb,
  'target': Target,
  'flame': Flame,
  'feather': Feather,
  'zap': Zap,
}

const COLORS: Record<string, string> = {
  'gold': 'bg-gold-500',
  'blue': 'bg-blue-500',
  'purple': 'bg-purple-500',
  'rose': 'bg-rose-500',
  'green': 'bg-emerald-500',
  'orange': 'bg-orange-500',
}

export default function SharedPromptPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [prompt, setPrompt] = useState<SharedPrompt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)

  useEffect(() => {
    if (slug) {
      loadPrompt()
    }
  }, [slug])

  const loadPrompt = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/prompts/public/${slug}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Prompt not found')
        return
      }

      setPrompt(data.prompt)
    } catch (err) {
      console.error('Load error:', err)
      setError('Error loading prompt')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy error:', err)
    }
  }

  const handleImport = async () => {
    if (!prompt) return

    setImporting(true)
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prompt.name,
          description: prompt.description,
          system_prompt: prompt.system_prompt,
          icon: prompt.icon,
          color: prompt.color,
          is_public: false,
          conversation_starters: prompt.conversation_starters || [],
        }),
      })

      if (response.ok) {
        setImported(true)
        setTimeout(() => {
          router.push('/app/daily-teaching/prompts')
        }, 1500)
      } else {
        const data = await response.json()
        if (data.error?.includes('already exists')) {
          alert('You already have a prompt with this name')
        } else if (response.status === 401) {
          // Not logged in, redirect to login
          router.push('/login?redirect=/share/prompt/' + slug)
        } else {
          alert(data.error || 'Error importing')
        }
      }
    } catch (err) {
      console.error('Import error:', err)
      alert('Error importing prompt')
    } finally {
      setImporting(false)
    }
  }

  const IconComponent = prompt ? (ICONS[prompt.icon] || Sparkles) : Sparkles
  const colorClass = prompt ? (COLORS[prompt.color] || 'bg-gold-500') : 'bg-gold-500'

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-gold-500" size={40} />
      </div>
    )
  }

  if (error || !prompt) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-3xl mx-auto mb-6 flex items-center justify-center">
            <Zap className="text-gray-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Prompt not found
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            This prompt does not exist or is not public.
          </p>
          <button
            onClick={() => router.push('/app/daily-teaching/prompts')}
            className="px-6 py-3 bg-gold-500 hover:bg-gold-600 text-white font-semibold rounded-xl transition-colors"
          >
            View my prompts
          </button>
        </div>
      </div>
    )
  }

  const starters = prompt.conversation_starters || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm text-gold-600 dark:text-gold-400 font-medium mb-2">
            Shared Prompt
          </p>
          <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100">
            Sri AB Teachings
          </h1>
        </div>

        {/* Prompt Card */}
        <div
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
          style={{ boxShadow: '0 25px 60px -12px rgba(214, 183, 95, 0.2)' }}
        >
          {/* Card Header */}
          <div className="p-8 text-center border-b border-gray-100 dark:border-gray-800">
            <div className={`w-20 h-20 ${colorClass} rounded-3xl mx-auto mb-5 flex items-center justify-center shadow-lg`}>
              <IconComponent className="text-white" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              {prompt.name}
            </h2>
            {prompt.description && (
              <p className="text-gray-500 dark:text-gray-400">
                {prompt.description}
              </p>
            )}
            {prompt.profiles?.full_name && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400">
                <User size={14} />
                <span>Created by {prompt.profiles.full_name}</span>
              </div>
            )}
          </div>

          {/* Conversation Starters */}
          {starters.length > 0 && (
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-4">
                <MessageCircle size={16} className="text-gold-500" />
                Usage Examples
              </p>
              <div className="space-y-2">
                {starters.map((starter, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300"
                  >
                    &ldquo;{starter}&rdquo;
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Prompt Preview */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
              Instructions
            </p>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                {prompt.system_prompt}
              </pre>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 space-y-3">
            <button
              onClick={handleImport}
              disabled={importing || imported}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-600 hover:to-gold-500 text-white font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 shadow-gold-lg"
            >
              {imported ? (
                <>
                  <Check size={22} />
                  <span>Successfully imported!</span>
                </>
              ) : importing ? (
                <>
                  <Loader2 className="animate-spin" size={22} />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Plus size={22} />
                  <span>Add to my Prompts</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
            >
              {copied ? (
                <>
                  <Check size={18} className="text-green-500" />
                  <span className="text-green-500">Link copied!</span>
                </>
              ) : (
                <>
                  <Copy size={18} />
                  <span>Copy link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-400">
            Used {prompt.usage_count} times
          </p>
        </div>
      </div>
    </div>
  )
}
