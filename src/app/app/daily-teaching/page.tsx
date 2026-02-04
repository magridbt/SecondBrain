'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import {
  Search,
  Loader2,
  Sparkles,
  Check,
  Copy,
  History,
  Plus,
  Trash2,
  Zap,
  X,
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
  Bot,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'

interface SearchResult {
  id: string
  content: string
  documentId: string
  documentName: string
  sourceName: string
  similarity: number
  language?: string
}

interface DailyMessage {
  id: string
  topic: string
  generated_message: string
  status: string
  created_at: string
  is_public: boolean
  share_token?: string
  ai_provider?: string
}

interface CustomPrompt {
  id: string
  name: string
  slug: string
  description: string
  system_prompt: string
  icon: string
  color: string
  is_owner: boolean
  usage_count: number
}

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  heart: Heart,
  brain: Brain,
  'share-2': Share2,
  star: Star,
  'message-square': MessageSquare,
  'book-open': BookOpen,
  lightbulb: Lightbulb,
  target: Target,
  flame: Flame,
  feather: Feather,
  zap: Zap,
}

const COLOR_MAP: Record<string, string> = {
  sage: 'bg-sage-500',
  green: 'bg-sage-500',
  gold: 'bg-gold-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  rose: 'bg-rose-500',
  orange: 'bg-orange-500',
}

const AI_PROVIDERS = [
  {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic Claude Sonnet 4',
    color: 'bg-orange-500',
    icon: '🟠',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    description: 'OpenAI GPT-4o',
    color: 'bg-emerald-500',
    icon: '🟢',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google Gemini 1.5 Pro',
    color: 'bg-blue-500',
    icon: '🔵',
  },
]

export default function DailyTeachingPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  // Search state
  const [topic, setTopic] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedChunks, setSelectedChunks] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Generation state
  const [generating, setGenerating] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [copied, setCopied] = useState(false)

  // History state
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<DailyMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Current message being edited/viewed
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)

  // Prompts state
  const [prompts, setPrompts] = useState<CustomPrompt[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<CustomPrompt | null>(null)
  const [showPromptDropdown, setShowPromptDropdown] = useState(false)
  const [promptFilter, setPromptFilter] = useState('')

  // AI Provider state
  const [selectedAI, setSelectedAI] = useState<string>('claude')
  const [showAIDropdown, setShowAIDropdown] = useState(false)

  // Load history and prompts on mount
  useEffect(() => {
    loadHistory()
    loadPrompts()
  }, [])

  // Handle slash command detection
  useEffect(() => {
    if (topic === '/') {
      setShowPromptDropdown(true)
      setPromptFilter('')
    } else if (topic.startsWith('/') && !selectedPrompt) {
      setShowPromptDropdown(true)
      setPromptFilter(topic.slice(1).toLowerCase())
    } else if (!topic.startsWith('/')) {
      setShowPromptDropdown(false)
    }
  }, [topic, selectedPrompt])

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch('/api/daily-message')
      const data = await response.json()
      if (data.messages) {
        setHistory(data.messages)
      }
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const loadPrompts = async () => {
    try {
      const response = await fetch('/api/prompts')
      const data = await response.json()
      if (data.prompts) {
        setPrompts(data.prompts)
      }
    } catch (error) {
      console.error('Error loading prompts:', error)
    }
  }

  const handleSelectPrompt = (prompt: CustomPrompt) => {
    setSelectedPrompt(prompt)
    setTopic('')
    setShowPromptDropdown(false)
    inputRef.current?.focus()
  }

  const handleRemovePrompt = () => {
    setSelectedPrompt(null)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim() || searching) return

    setSearching(true)
    setSearchResults([])
    setSelectedChunks([])
    setGeneratedMessage('')
    setCurrentMessageId(null)

    try {
      const response = await fetch('/api/daily-message/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })

      const data = await response.json()

      if (data.results) {
        setSearchResults(data.results)
      }
    } catch (error) {
      console.error('Error searching:', error)
    } finally {
      setSearching(false)
    }
  }

  const toggleChunkSelection = (chunkId: string) => {
    setSelectedChunks(prev =>
      prev.includes(chunkId)
        ? prev.filter(id => id !== chunkId)
        : [...prev, chunkId]
    )
  }

  const selectAllChunks = () => {
    if (selectedChunks.length === searchResults.length) {
      setSelectedChunks([])
    } else {
      setSelectedChunks(searchResults.map(r => r.id))
    }
  }

  const handleGenerate = async () => {
    if (selectedChunks.length === 0 || generating) return

    setGenerating(true)

    try {
      const selectedContent = searchResults
        .filter(r => selectedChunks.includes(r.id))
        .map(r => ({
          id: r.id,
          content: r.content,
          sourceName: r.sourceName,
          documentName: r.documentName,
        }))

      const response = await fetch('/api/daily-message/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          selectedChunks: selectedContent,
          promptId: selectedPrompt?.id,
          customPrompt: selectedPrompt?.system_prompt,
          aiProvider: selectedAI,
        }),
      })

      const data = await response.json()

      if (data.error) {
        showToast(data.error, 'error')
      } else if (data.message) {
        setGeneratedMessage(data.message)
        setCurrentMessageId(data.id)
        loadHistory()
      }
    } catch (error) {
      console.error('Error generating:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying:', error)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Teaching',
      message: 'Are you sure you want to delete this teaching? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      await fetch(`/api/daily-message?id=${id}`, { method: 'DELETE' })
      showToast('Teaching deleted successfully', 'success')
      loadHistory()
      if (currentMessageId === id) {
        setGeneratedMessage('')
        setCurrentMessageId(null)
      }
    } catch (error) {
      console.error('Error deleting:', error)
      showToast('Failed to delete teaching', 'error')
    }
  }

  const handleLoadMessage = (message: DailyMessage) => {
    setTopic(message.topic)
    setGeneratedMessage(message.generated_message)
    setCurrentMessageId(message.id)
    setSearchResults([])
    setSelectedChunks([])
    setShowHistory(false)
  }

  const handleNewMessage = () => {
    setTopic('')
    setSearchResults([])
    setSelectedChunks([])
    setGeneratedMessage('')
    setCurrentMessageId(null)
    setSelectedPrompt(null)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredPrompts = prompts.filter(p =>
    p.name.toLowerCase().includes(promptFilter) ||
    p.slug.includes(promptFilter) ||
    p.description?.toLowerCase().includes(promptFilter)
  )

  const getPromptIcon = (iconName: string) => ICON_MAP[iconName] || Sparkles
  const getPromptColor = (colorName: string) => COLOR_MAP[colorName] || 'bg-sage-500'
  const selectedAIProvider = AI_PROVIDERS.find(p => p.id === selectedAI) || AI_PROVIDERS[0]

  return (
    <div className="flex h-full">
      {/* Sidebar - History */}
      <div className={`
        ${showHistory ? 'w-80' : 'w-0'}
        bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-sage-100/50 dark:border-sage-800/30 transition-all duration-300 overflow-hidden flex-shrink-0
      `}>
        <div className="flex flex-col h-full w-80">
          <div className="p-4 border-b border-sage-100/50 dark:border-sage-800/30">
            <button
              onClick={handleNewMessage}
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-sage-500 to-sage-400 hover:from-sage-600 hover:to-sage-500 text-white rounded-2xl transition-all duration-300 shadow-sage hover:shadow-sage-lg transform hover:-translate-y-0.5"
            >
              <Plus size={18} />
              <span className="font-semibold">New Teaching</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
              History
            </p>
            {loadingHistory ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-sage-400" size={20} />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No messages yet
              </div>
            ) : (
              <div className="space-y-1">
                {history.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => handleLoadMessage(msg)}
                    className={`
                      group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
                      ${currentMessageId === msg.id
                        ? 'bg-gradient-to-r from-sage-500/10 to-sage-400/10 text-sage-700 dark:text-sage-400 border border-sage-200/50 dark:border-sage-700/30'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-sage-50/50 dark:hover:bg-sage-900/20'
                      }
                    `}
                  >
                    <Sparkles size={16} className={`flex-shrink-0 ${currentMessageId === msg.id ? 'text-sage-600 dark:text-sage-400' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">{msg.topic}</p>
                      <p className="text-xs text-gray-400">{formatDate(msg.created_at)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(msg.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200"
                    >
                      <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-sage-100/50 dark:border-sage-800/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2.5 hover:bg-sage-50 dark:hover:bg-sage-900/20 rounded-xl transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-sage-600 dark:hover:text-sage-400"
            >
              <History size={20} />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-gradient-to-br from-sage-400 to-sage-600 rounded-2xl flex items-center justify-center shadow-sage">
                <Sparkles className="text-white" size={18} />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 dark:text-gray-100 text-sm tracking-tight">Daily Teaching</h1>
                <p className="text-xs text-sage-600 dark:text-sage-400 font-medium">
                  Type <span className="font-mono bg-sage-100 dark:bg-sage-900/30 px-1 rounded">/</span> for prompts
                </p>
              </div>
            </div>

            {/* AI Provider Selector */}
            <div className="relative">
              <button
                onClick={() => setShowAIDropdown(!showAIDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-sage-100/50 dark:border-sage-800/30 rounded-xl hover:bg-sage-50/50 dark:hover:bg-sage-900/20 transition-all"
              >
                <span className="text-lg">{selectedAIProvider.icon}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                  {selectedAIProvider.name}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showAIDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showAIDropdown && (
                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-900 border border-sage-100/50 dark:border-sage-800/30 rounded-xl shadow-xl overflow-hidden z-50 w-56 animate-slideUp">
                  <div className="p-2 border-b border-sage-100/50 dark:border-sage-800/30">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 flex items-center gap-2">
                      <Bot size={12} />
                      Select AI Provider
                    </p>
                  </div>
                  {AI_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        setSelectedAI(provider.id)
                        setShowAIDropdown(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-sage-50/50 dark:hover:bg-sage-900/20 transition-colors text-left ${
                        selectedAI === provider.id ? 'bg-sage-50 dark:bg-sage-900/30' : ''
                      }`}
                    >
                      <span className="text-xl">{provider.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-gray-100">{provider.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{provider.description}</p>
                      </div>
                      {selectedAI === provider.id && (
                        <Check size={16} className="text-sage-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-gray-800 dark:to-gray-900">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Search Form */}
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-sage-100/50 dark:border-sage-800/30 p-6 shadow-lg animate-fadeIn"
                 style={{ boxShadow: '0 15px 40px -12px rgba(34, 197, 94, 0.15)' }}>

              {/* Selected Prompt Badge */}
              {selectedPrompt && (
                <div className="mb-4 flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${getPromptColor(selectedPrompt.color)} bg-opacity-10 border border-current border-opacity-20`}>
                    {(() => {
                      const IconComp = getPromptIcon(selectedPrompt.icon)
                      return <IconComp size={16} className={`${getPromptColor(selectedPrompt.color).replace('bg-', 'text-')}`} />
                    })()}
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {selectedPrompt.name}
                    </span>
                    <button
                      onClick={handleRemovePrompt}
                      className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <X size={14} className="text-gray-500" />
                    </button>
                  </div>
                </div>
              )}

              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
                {selectedPrompt ? `Using: ${selectedPrompt.name}` : 'What topic would you like a teaching about?'}
              </h2>

              <form onSubmit={handleSearch} className="relative">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      ref={inputRef}
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder={selectedPrompt ? "Enter the topic..." : "Type / for prompts or enter a topic..."}
                      className="w-full pl-12 pr-4 py-4 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl focus:ring-2 focus:ring-sage-400 dark:focus:ring-sage-600 focus:border-transparent outline-none transition-all duration-300 placeholder-gray-400"
                      disabled={searching}
                    />

                    {/* Prompt Dropdown */}
                    {showPromptDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-sage-100/50 dark:border-sage-800/30 rounded-2xl shadow-xl overflow-hidden z-50 animate-slideUp"
                           style={{ boxShadow: '0 15px 40px -12px rgba(34, 197, 94, 0.25)' }}>
                        <div className="p-3 border-b border-sage-100/50 dark:border-sage-800/30">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Zap size={12} />
                            Select a Prompt
                          </p>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {filteredPrompts.length === 0 ? (
                            <div className="p-4 text-center">
                              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                                {prompts.length === 0 ? 'No prompts created yet' : 'No prompts found'}
                              </p>
                              <button
                                onClick={() => {
                                  setShowPromptDropdown(false)
                                  setTopic('')
                                  router.push('/app/daily-teaching/prompts')
                                }}
                                className="text-sm text-sage-600 hover:text-sage-700 font-medium"
                              >
                                Create your first prompt
                              </button>
                            </div>
                          ) : (
                            filteredPrompts.map((prompt) => {
                              const IconComp = getPromptIcon(prompt.icon)
                              const colorClass = getPromptColor(prompt.color)
                              return (
                                <button
                                  key={prompt.id}
                                  onClick={() => handleSelectPrompt(prompt)}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sage-50/50 dark:hover:bg-sage-900/20 transition-colors text-left"
                                >
                                  <div className={`w-10 h-10 ${colorClass} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                    <IconComp className="text-white" size={18} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                                      {prompt.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {prompt.description || `/${prompt.slug}`}
                                    </p>
                                  </div>
                                  <span className="text-xs text-gray-400 font-mono">
                                    /{prompt.slug}
                                  </span>
                                </button>
                              )
                            })
                          )}
                        </div>
                        {prompts.length > 0 && (
                          <div className="p-2 border-t border-sage-100/50 dark:border-sage-800/30">
                            <button
                              onClick={() => {
                                setShowPromptDropdown(false)
                                setTopic('')
                                router.push('/app/daily-teaching/prompts')
                              }}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-sage-600 hover:bg-sage-50 dark:hover:bg-sage-900/20 rounded-xl transition-colors font-medium"
                            >
                              <Plus size={16} />
                              Manage Prompts
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={searching || !topic.trim() || showPromptDropdown}
                    className="px-6 py-4 bg-gradient-to-r from-sage-500 to-sage-400 hover:from-sage-600 hover:to-sage-500 text-white font-semibold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sage hover:shadow-sage-lg"
                  >
                    {searching ? (
                      <Loader2 className="animate-spin" size={22} />
                    ) : (
                      <Search size={22} />
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-sage-100/50 dark:border-sage-800/30 overflow-hidden shadow-lg animate-slideUp"
                   style={{ boxShadow: '0 15px 40px -12px rgba(34, 197, 94, 0.15)' }}>
                <div className="px-6 py-4 border-b border-sage-100/50 dark:border-sage-800/30 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">
                      Teachings Found
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Select the passages to use in the message
                    </p>
                  </div>
                  <button
                    onClick={selectAllChunks}
                    className="text-sm text-sage-600 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300 font-medium"
                  >
                    {selectedChunks.length === searchResults.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                <div className="divide-y divide-sage-100/50 dark:divide-sage-800/30 max-h-[400px] overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => toggleChunkSelection(result.id)}
                      className={`p-4 cursor-pointer transition-all duration-200 ${
                        selectedChunks.includes(result.id)
                          ? 'bg-sage-50/50 dark:bg-sage-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`
                          w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all
                          ${selectedChunks.includes(result.id)
                            ? 'bg-sage-500 border-sage-500 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                          }
                        `}>
                          {selectedChunks.includes(result.id) && <Check size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-sage-600 dark:text-sage-400">
                              {result.sourceName}
                            </span>
                            <span className="text-sage-300 dark:text-sage-600">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {result.documentName}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                            {result.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Generate Button */}
                <div className="p-4 border-t border-sage-100/50 dark:border-sage-800/30 bg-gray-50/50 dark:bg-gray-800/30">
                  <button
                    onClick={handleGenerate}
                    disabled={selectedChunks.length === 0 || generating}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-sage-500 to-sage-400 hover:from-sage-600 hover:to-sage-500 text-white font-semibold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sage hover:shadow-sage-lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Generating with {selectedAIProvider.name}...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">{selectedAIProvider.icon}</span>
                        <span>
                          Generate with {selectedAIProvider.name} ({selectedChunks.length} selected)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Generated Message */}
            {generatedMessage && (
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-sage-100/50 dark:border-sage-800/30 overflow-hidden shadow-lg animate-slideUp"
                   style={{ boxShadow: '0 15px 40px -12px rgba(34, 197, 94, 0.15)' }}>
                <div className="px-6 py-4 border-b border-sage-100/50 dark:border-sage-800/30 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">
                    Daily Teaching
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                        copied
                          ? 'bg-sage-100 dark:bg-sage-900/30 text-sage-600'
                          : 'hover:bg-sage-50 dark:hover:bg-sage-900/20 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="prose-spiritual dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 leading-relaxed">
                      {generatedMessage}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!searchResults.length && !generatedMessage && (
              <div className="text-center py-12 animate-fadeIn">
                <div className="w-24 h-24 bg-gradient-to-br from-sage-400 to-sage-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-sage-lg">
                  <Sparkles className="text-white" size={40} />
                </div>
                <h2 className="text-2xl font-black tracking-tighter text-gray-800 dark:text-gray-100 mb-3">
                  Create Your Daily Teaching
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  Type <span className="font-mono bg-sage-100 dark:bg-sage-900/30 px-1.5 py-0.5 rounded">/</span> to
                  use a custom prompt, or enter a topic directly.
                </p>

                {/* AI Provider Pills */}
                <div className="flex justify-center gap-3 mb-8">
                  {AI_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedAI(provider.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedAI === provider.id
                          ? 'bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-400 border-2 border-sage-300 dark:border-sage-600'
                          : 'bg-white dark:bg-gray-900 border border-sage-100/50 dark:border-sage-800/30 text-gray-600 dark:text-gray-400 hover:border-sage-300'
                      }`}
                    >
                      <span>{provider.icon}</span>
                      {provider.name}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 justify-center mb-8">
                  {['Gratitude', 'Suffering', 'Relationships', 'Prosperity', 'Meditation', 'Enlightenment'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setTopic(suggestion)}
                      className="px-4 py-2 bg-white dark:bg-gray-900 border border-sage-100/50 dark:border-sage-800/30 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-sage-300 dark:hover:border-sage-600 hover:bg-sage-50/30 dark:hover:bg-sage-900/20 transition-all duration-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {/* Quick access to prompts */}
                {prompts.length > 0 && (
                  <div className="border-t border-sage-100/50 dark:border-sage-800/30 pt-6">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                      Your Prompts
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {prompts.slice(0, 4).map((prompt) => {
                        const IconComp = getPromptIcon(prompt.icon)
                        const colorClass = getPromptColor(prompt.color)
                        return (
                          <button
                            key={prompt.id}
                            onClick={() => handleSelectPrompt(prompt)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-sage-100/50 dark:border-sage-800/30 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-sage-300 dark:hover:border-sage-600 hover:bg-sage-50/30 dark:hover:bg-sage-900/20 transition-all duration-200"
                          >
                            <div className={`w-6 h-6 ${colorClass} rounded-lg flex items-center justify-center`}>
                              <IconComp className="text-white" size={12} />
                            </div>
                            {prompt.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
