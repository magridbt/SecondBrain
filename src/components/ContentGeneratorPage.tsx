'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { highlightKeywords } from '@/lib/highlight-utils'
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
  Settings,
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

export interface ContentGeneratorProps {
  category: string
  title: string
  icon: LucideIcon
  promptsPath: string
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

export default function ContentGeneratorPage({ category, title, icon: PageIcon, promptsPath }: ContentGeneratorProps) {
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
  const [isEditing, setIsEditing] = useState(false)
  const [editedMessage, setEditedMessage] = useState('')
  const [generateError, setGenerateError] = useState('')
  const [lastGeneratedChunks, setLastGeneratedChunks] = useState<string[]>([])
  const messageRef = useRef<HTMLTextAreaElement>(null)

  // Histórico state
  const [showHistory, setShowHistory] = useState(true)
  const [history, setHistory] = useState<DailyMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('')

  // Current message being edited/viewed
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)

  // Prompts state
  const [prompts, setPrompts] = useState<CustomPrompt[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<CustomPrompt | null>(null)

  // AI Provider state
  const [selectedAI, setSelectedAI] = useState<string>('claude')
  const [showAIDropdown, setShowAIDropdown] = useState(false)

  // Load history and prompts on mount
  useEffect(() => {
    loadHistory()
    loadPrompts()
  }, [category])


  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/daily-message?limit=300&category=${encodeURIComponent(category)}`)
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
      const response = await fetch(`/api/prompts?category=${category}`)
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
    inputRef.current?.focus()
  }

  const handleRemovePrompt = () => {
    setSelectedPrompt(null)
    if (!searchResults.length && !generatedMessage) {
      setTopic('')
    }
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
        const topChunks = data.results
          .sort((a: SearchResult, b: SearchResult) => (b.similarity || 0) - (a.similarity || 0))
          .slice(0, 3)
          .map((r: SearchResult) => r.id)
        setSelectedChunks(topChunks)
      }
    } catch (error) {
      console.error('Error searching:', error)
      showToast('Erro ao buscar ensinamentos. Tente novamente.', 'error')
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

  const handleGenerate = async (rechunks?: string[]) => {
    const chunksToUse = rechunks || selectedChunks
    if (chunksToUse.length === 0 || generating) return

    setGenerating(true)
    setGeneratedMessage('')
    setGenerateError('')
    setIsEditing(false)
    setLastGeneratedChunks(chunksToUse)

    const selectedContent = searchResults
      .filter(r => chunksToUse.includes(r.id))
      .map(r => ({
        id: r.id,
        content: r.content,
        sourceName: r.sourceName,
        documentName: r.documentName,
      }))

    try {
      const response = await fetch('/api/daily-message/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          selectedChunks: selectedContent,
          promptId: selectedPrompt?.id,
          customPrompt: selectedPrompt?.system_prompt,
          aiProvider: selectedAI,
          category,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Erro ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        if (data.error) throw new Error(data.error)
        setGeneratedMessage(data.message || '')
        setCurrentMessageId(data.id)
        loadHistory()
        return
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Sem resposta do servidor')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'text') {
              fullText += event.text
              setGeneratedMessage(fullText)
            } else if (event.type === 'done') {
              setCurrentMessageId(event.id)
              loadHistory()
            } else if (event.type === 'error') {
              throw new Error(event.error)
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              throw e
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error generating:', error)
      const msg = error?.message || 'Erro desconhecido ao gerar mensagem'
      setGenerateError(msg)
      showToast(msg, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleRegenerateMessage = () => {
    if (lastGeneratedChunks.length > 0) {
      handleGenerate(lastGeneratedChunks)
    } else if (selectedChunks.length > 0) {
      handleGenerate()
    }
  }

  const handleCopy = async () => {
    try {
      const textToCopy = isEditing ? editedMessage : generatedMessage
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      showToast('Copiado!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying:', error)
    }
  }

  const handleStartEdit = () => {
    setEditedMessage(generatedMessage)
    setIsEditing(true)
    setTimeout(() => messageRef.current?.focus(), 100)
  }

  const handleSaveEdit = async () => {
    setGeneratedMessage(editedMessage)
    setIsEditing(false)
    if (currentMessageId) {
      try {
        await fetch(`/api/daily-message`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentMessageId, generated_message: editedMessage }),
        })
        showToast('Ensinamento atualizado', 'success')
      } catch {
        showToast('Erro ao salvar edição', 'error')
      }
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedMessage('')
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir Mensagem',
      message: 'Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      await fetch(`/api/daily-message?id=${id}`, { method: 'DELETE' })
      showToast('Mensagem excluída com sucesso', 'success')
      loadHistory()
      if (currentMessageId === id) {
        setGeneratedMessage('')
        setCurrentMessageId(null)
      }
    } catch (error) {
      console.error('Error deleting:', error)
      showToast('Falha ao excluir mensagem', 'error')
    }
  }

  const handleLoadMessage = (message: DailyMessage) => {
    setTopic(message.topic)
    setGeneratedMessage(message.generated_message)
    setCurrentMessageId(message.id)
    setSearchResults([])
    setSelectedChunks([])
  }

  const handleRegenerate = async () => {
    if (!topic.trim()) return
    setSearching(true)
    setSearchResults([])
    setSelectedChunks([])
    setGeneratedMessage('')
    setCurrentMessageId(null)
    setGenerateError('')
    setIsEditing(false)

    try {
      const response = await fetch('/api/daily-message/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      const data = await response.json()
      if (data.results) {
        setSearchResults(data.results)
        const topChunks = data.results
          .sort((a: SearchResult, b: SearchResult) => (b.similarity || 0) - (a.similarity || 0))
          .slice(0, 3)
          .map((r: SearchResult) => r.id)
        setSelectedChunks(topChunks)
      }
    } catch (error) {
      console.error('Error searching:', error)
      showToast('Erro ao buscar ensinamentos', 'error')
    } finally {
      setSearching(false)
    }
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

  const filteredHistory = historyFilter.trim()
    ? history.filter(msg =>
        msg.topic.toLowerCase().includes(historyFilter.toLowerCase()) ||
        msg.generated_message?.toLowerCase().includes(historyFilter.toLowerCase())
      )
    : history

  const getPromptIcon = (iconName: string) => ICON_MAP[iconName] || Sparkles
  const getPromptColor = (colorName: string) => COLOR_MAP[colorName] || 'bg-sage-500'
  const selectedAIProvider = AI_PROVIDERS.find(p => p.id === selectedAI) || AI_PROVIDERS[0]

  return (
    <div className="flex h-full">
      {/* Sidebar - Histórico */}
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
              <span className="font-semibold">Nova Mensagem</span>
            </button>
          </div>

          {/* Filter */}
          <div className="px-3 pt-3 pb-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                placeholder="Filtrar historico..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-1 focus:ring-sage-400 outline-none transition-all placeholder-gray-400"
              />
              {historyFilter && (
                <button
                  onClick={() => setHistoryFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            <div className="flex items-center justify-between mb-2 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Historico
              </p>
              <span className="text-xs text-gray-400">
                {filteredHistory.length}{historyFilter ? `/${history.length}` : ''}
              </span>
            </div>
            {loadingHistory ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-sage-400" size={20} />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                {historyFilter ? 'Nenhum resultado para este filtro' : 'Nenhuma mensagem ainda'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredHistory.map((msg) => (
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
                    <PageIcon size={16} className={`flex-shrink-0 ${currentMessageId === msg.id ? 'text-sage-600 dark:text-sage-400' : 'text-gray-400'}`} />
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
                <PageIcon className="text-white" size={18} />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 dark:text-gray-100 text-sm tracking-tight">{title}</h1>
                <p className="text-xs text-sage-600 dark:text-sage-400 font-medium">
                  Digite <span className="font-mono bg-sage-100 dark:bg-sage-900/30 px-1 rounded">/</span> para prompts
                </p>
              </div>
            </div>

            {/* New Message Button */}
            {(searchResults.length > 0 || generatedMessage) && (
              <button
                onClick={handleNewMessage}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sage-500 to-sage-400 hover:from-sage-600 hover:to-sage-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-sage hover:shadow-sage-lg text-sm"
              >
                <Plus size={16} />
                <span>Novo</span>
              </button>
            )}

            {/* Settings & Prompts */}
            <button
              onClick={() => router.push(promptsPath)}
              className="p-2.5 hover:bg-sage-50 dark:hover:bg-sage-900/20 rounded-xl transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-sage-600 dark:hover:text-sage-400"
              title="Gerenciar Prompts"
            >
              <Settings size={20} />
            </button>

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
                      Selecione o Provedor de IA
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
            {/* Step 1: Select Prompt */}
            {!selectedPrompt && !searchResults.length && !generatedMessage && prompts.length > 0 && (
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-sage-100/50 dark:border-sage-800/30 p-6 shadow-lg animate-fadeIn"
                   style={{ boxShadow: '0 15px 40px -12px rgba(34, 197, 94, 0.15)' }}>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
                  Escolha um Prompt
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Selecione o estilo do conteúdo que deseja gerar
                </p>

                <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto">
                  {prompts.map((prompt) => {
                    const IconComp = getPromptIcon(prompt.icon)
                    const colorClass = getPromptColor(prompt.color)
                    return (
                      <button
                        key={prompt.id}
                        onClick={() => handleSelectPrompt(prompt)}
                        className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-gray-900 border border-sage-100/50 dark:border-sage-800/30 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-sage-300 dark:hover:border-sage-600 hover:bg-sage-50/30 dark:hover:bg-sage-900/20 hover:shadow-sm transition-all duration-200"
                      >
                        <div className={`w-7 h-7 ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <IconComp className="text-white" size={14} />
                        </div>
                        {prompt.name}
                      </button>
                    )
                  })}
                </div>

                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => router.push(promptsPath)}
                    className="flex items-center gap-1.5 text-xs text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 font-medium transition-colors"
                  >
                    <Settings size={12} />
                    Gerenciar
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Search Form (always visible) */}
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
                {selectedPrompt ? `Usando: ${selectedPrompt.name}` : 'Qual tema para o conteúdo?'}
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
                      placeholder="Digite o tema..."
                      className="w-full pl-12 pr-4 py-4 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl focus:ring-2 focus:ring-sage-400 dark:focus:ring-sage-600 focus:border-transparent outline-none transition-all duration-300 placeholder-gray-400"
                      disabled={searching}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching || !topic.trim()}
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
                      Ensinamentos Encontrados
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Selecione as passagens para usar na mensagem
                    </p>
                  </div>
                  <button
                    onClick={selectAllChunks}
                    className="text-sm text-sage-600 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300 font-medium"
                  >
                    {selectedChunks.length === searchResults.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
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
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              result.similarity >= 0.7
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : result.similarity >= 0.5
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {Math.round(result.similarity * 100)}%
                            </span>
                            <span className="text-xs font-medium text-sage-600 dark:text-sage-400">
                              {result.sourceName}
                            </span>
                            <span className="text-sage-300 dark:text-sage-600">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {result.documentName}
                            </span>
                          </div>
                          <p
                            className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3"
                            dangerouslySetInnerHTML={{
                              __html: highlightKeywords(result.content, topic)
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Generate Button */}
                <div className="p-4 border-t border-sage-100/50 dark:border-sage-800/30 bg-gray-50/50 dark:bg-gray-800/30">
                  <button
                    onClick={() => handleGenerate()}
                    disabled={selectedChunks.length === 0 || generating}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-sage-500 to-sage-400 hover:from-sage-600 hover:to-sage-500 text-white font-semibold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sage hover:shadow-sage-lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Gerando com {selectedAIProvider.name}...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">{selectedAIProvider.icon}</span>
                        <span>
                          Gerar com {selectedAIProvider.name} ({selectedChunks.length} selecionado{selectedChunks.length > 1 ? 's' : ''})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {generateError && !generatedMessage && (
              <div className="bg-red-50 dark:bg-red-900/20 backdrop-blur-xl rounded-2xl border border-red-200 dark:border-red-800/50 p-6 animate-slideUp">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <X size={20} className="text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-800 dark:text-red-300 mb-1">Erro ao gerar</h3>
                    <p className="text-sm text-red-600 dark:text-red-400 mb-3">{generateError}</p>
                    <button
                      onClick={() => handleGenerate()}
                      className="px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl text-sm font-medium transition-all"
                    >
                      Tentar novamente
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Message */}
            {(generatedMessage || generating) && (
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-sage-100/50 dark:border-sage-800/30 overflow-hidden shadow-lg animate-slideUp"
                   style={{ boxShadow: '0 15px 40px -12px rgba(34, 197, 94, 0.15)' }}>
                <div className="px-6 py-4 border-b border-sage-100/50 dark:border-sage-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">
                      {title}
                    </h3>
                    {generating && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-sage-100 dark:bg-sage-900/30 rounded-full text-xs font-medium text-sage-600 dark:text-sage-400">
                        <Loader2 className="animate-spin" size={12} />
                        Gerando...
                      </span>
                    )}
                    {isEditing && (
                      <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full text-xs font-medium text-amber-600 dark:text-amber-400">
                        Editando
                      </span>
                    )}
                  </div>
                  {!generating && generatedMessage && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleRegenerateMessage}
                        disabled={generating}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 hover:bg-sage-50 dark:hover:bg-sage-900/20 text-gray-500 dark:text-gray-400 text-sm font-medium"
                        title="Gerar novamente"
                      >
                        <Sparkles size={14} />
                        Gerar novamente
                      </button>
                      {!isEditing ? (
                        <button
                          onClick={handleStartEdit}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 hover:bg-sage-50 dark:hover:bg-sage-900/20 text-gray-500 dark:text-gray-400 text-sm font-medium"
                        >
                          <Feather size={14} />
                          Editar
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-400 text-sm font-medium"
                          >
                            <Check size={14} />
                            Salvar
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 text-sm font-medium"
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={handleRegenerate}
                        disabled={searching}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 hover:bg-sage-50 dark:hover:bg-sage-900/20 text-gray-500 dark:text-gray-400 text-sm font-medium"
                        title="Buscar novos ensinamentos"
                      >
                        {searching ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
                        Nova busca
                      </button>
                      <button
                        onClick={handleCopy}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
                          copied
                            ? 'bg-sage-100 dark:bg-sage-900/30 text-sage-600'
                            : 'hover:bg-sage-50 dark:hover:bg-sage-900/20 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {isEditing ? (
                    <textarea
                      ref={messageRef}
                      value={editedMessage}
                      onChange={(e) => setEditedMessage(e.target.value)}
                      className="w-full min-h-[300px] p-4 border border-sage-200 dark:border-sage-800 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl focus:ring-2 focus:ring-sage-400 outline-none transition-all resize-y leading-relaxed font-sans"
                    />
                  ) : (
                    <div className="prose-spiritual dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 leading-relaxed">
                        {generatedMessage}
                        {generating && <span className="inline-block w-1.5 h-5 bg-sage-500 animate-pulse ml-0.5 align-middle rounded-sm" />}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
