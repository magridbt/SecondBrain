'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import ConversationSidebar, { SidebarItem } from '@/components/ConversationSidebar'
import {
  Send,
  Loader2,
  Sparkles,
  Check,
  Copy,
  History,
  Plus,
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
  Pencil,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'

interface DailyMessage {
  id: string
  topic: string
  generated_message: string
  status: string
  created_at: string
  is_public: boolean
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

export interface DirectChatProps {
  category: string
  title: string
  icon: LucideIcon
  promptsPath: string
}

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles, heart: Heart, brain: Brain, 'share-2': Share2,
  star: Star, 'message-square': MessageSquare, 'book-open': BookOpen,
  lightbulb: Lightbulb, target: Target, flame: Flame, feather: Feather, zap: Zap,
}

const COLOR_MAP: Record<string, string> = {
  sage: 'bg-sage-500', green: 'bg-sage-500', gold: 'bg-gold-500',
  blue: 'bg-blue-500', purple: 'bg-purple-500', rose: 'bg-rose-500', orange: 'bg-orange-500',
}

const AI_PROVIDERS = [
  { id: 'claude', name: 'Claude', description: 'Anthropic Claude Sonnet 4', color: 'bg-orange-500', icon: '🟠' },
  { id: 'chatgpt', name: 'ChatGPT', description: 'OpenAI GPT-4o', color: 'bg-emerald-500', icon: '🟢' },
  { id: 'gemini', name: 'Gemini', description: 'Google Gemini 1.5 Pro', color: 'bg-blue-500', icon: '🔵' },
]

export default function DirectChatPage({ category, title, icon: PageIcon, promptsPath }: DirectChatProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const [topic, setTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedMessage, setEditedMessage] = useState('')
  const [generateError, setGenerateError] = useState('')
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [showHistory, setShowHistory] = useState(true)
  const [history, setHistory] = useState<DailyMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)

  const [prompts, setPrompts] = useState<CustomPrompt[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<CustomPrompt | null>(null)
  const [selectedAI, setSelectedAI] = useState<string>('claude')
  const [showAIDropdown, setShowAIDropdown] = useState(false)

  useEffect(() => {
    loadHistory()
    loadPrompts()
  }, [category])

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/daily-message?limit=300&category=${encodeURIComponent(category)}`)
      const data = await response.json()
      if (data.messages) setHistory(data.messages)
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
      if (data.prompts) setPrompts(data.prompts)
    } catch (error) {
      console.error('Error loading prompts:', error)
    }
  }

  const handleSelectPrompt = (prompt: CustomPrompt) => {
    setSelectedPrompt(prompt)
    inputRef.current?.focus()
  }

  const handleGenerate = async () => {
    if (!topic.trim() || generating) return

    if (!selectedPrompt) {
      showToast('Selecione um prompt antes de gerar', 'warning')
      return
    }

    setGenerating(true)
    setGeneratedMessage('')
    setGenerateError('')
    setIsEditing(false)
    const userMessage = topic.trim()
    setTopic('')

    try {
      // Auto-search for relevant teaching chunks (invisible RAG)
      interface SearchChunk {
        id: string
        content: string
        sourceName: string
        documentName: string
      }

      interface SearchResultItem {
        id: string
        content: string
        sourceName?: string
        documentName?: string
        similarity?: number
      }

      let autoChunks: SearchChunk[] = []
      try {
        const searchResponse = await fetch('/api/daily-message/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: userMessage }),
        })
        const searchData = await searchResponse.json()
        if (searchData.results?.length) {
          // Pick top 5 most relevant chunks automatically
          autoChunks = searchData.results
            .sort((a: SearchResultItem, b: SearchResultItem) => (b.similarity || 0) - (a.similarity || 0))
            .slice(0, 5)
            .map((r: SearchResultItem) => ({
              id: r.id,
              content: r.content,
              sourceName: r.sourceName,
              documentName: r.documentName,
            }))
        }
      } catch {
        // If search fails, proceed without chunks
      }

      const response = await fetch('/api/daily-message/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: userMessage,
          selectedChunks: autoChunks,
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
          } catch (e: unknown) {
            if (e instanceof Error && e.message && e.message !== 'Unexpected end of JSON input') throw e
          }
        }
      }
    } catch (error: unknown) {
      console.error('Error generating:', error)
      const msg = error instanceof Error ? error.message : 'Erro desconhecido ao gerar mensagem'
      setGenerateError(msg)
      showToast(msg, 'error')
    } finally {
      setGenerating(false)
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
        showToast('Mensagem atualizada', 'success')
      } catch {
        showToast('Erro ao salvar edição', 'error')
      }
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir Mensagem',
      message: 'Tem certeza que deseja excluir esta mensagem?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    })
    if (!confirmed) return
    try {
      await fetch(`/api/daily-message?id=${id}`, { method: 'DELETE' })
      showToast('Mensagem excluída', 'success')
      loadHistory()
      if (currentMessageId === id) {
        setGeneratedMessage('')
        setCurrentMessageId(null)
      }
    } catch {
      showToast('Falha ao excluir mensagem', 'error')
    }
  }

  const handleLoadMessage = (message: DailyMessage) => {
    setTopic(message.topic)
    setGeneratedMessage(message.generated_message)
    setCurrentMessageId(message.id)
  }

  const handleNewMessage = () => {
    setTopic('')
    setGeneratedMessage('')
    setCurrentMessageId(null)
    setSelectedPrompt(null)
    setGenerateError('')
    setIsEditing(false)
  }

  // Map history to SidebarItem[]
  const sidebarItems: SidebarItem[] = useMemo(() =>
    history.map(msg => ({
      id: msg.id,
      title: msg.topic || 'Sem título',
      date: msg.created_at,
    })),
    [history]
  )

  const handleSidebarSelect = (id: string) => {
    const message = history.find(msg => msg.id === id)
    if (message) handleLoadMessage(message)
  }

  const getPromptIcon = (iconName: string) => ICON_MAP[iconName] || Sparkles
  const getPromptColor = (colorName: string) => COLOR_MAP[colorName] || 'bg-sage-500'
  const selectedAIProvider = AI_PROVIDERS.find(p => p.id === selectedAI) || AI_PROVIDERS[0]

  return (
    <div className="flex h-full">
      {/* History Sidebar */}
      <ConversationSidebar
        items={sidebarItems}
        activeId={currentMessageId}
        loading={loadingHistory}
        onSelect={handleSidebarSelect}
        onDelete={handleDelete}
        onNew={handleNewMessage}
        open={showHistory}
        width="w-80"
        colorTheme="sage"
        newButtonText="Nova Mensagem"
        emptyMessage="Sem histórico"
        searchable={true}
        groupByDate={true}
        renamable={false}
        showCount={true}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-sage-100/50 dark:border-sage-800/30 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-xl transition-colors ${showHistory ? 'bg-sage-100 dark:bg-sage-900/30 text-sage-600' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <History size={18} />
            </button>
            <PageIcon size={22} className="text-sage-600 dark:text-sage-400" />
            <div>
              <h1 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{title}</h1>
              <p className="text-xs text-gray-400">
                {selectedPrompt ? `Usando: ${selectedPrompt.name}` : 'Digite / para prompts'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewMessage}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sage-500 to-sage-400 text-white text-sm font-semibold rounded-xl shadow-sage hover:shadow-sage-lg transition-all"
            >
              <Plus size={16} />
              Novo
            </button>
            <button
              onClick={() => router.push(promptsPath)}
              className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              title="Gerenciar Prompts"
            >
              <Settings size={18} />
            </button>
            {/* AI Provider Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAIDropdown(!showAIDropdown)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span>{selectedAIProvider.icon}</span>
                <span>{selectedAIProvider.name}</span>
                <ChevronDown size={14} />
              </button>
              {showAIDropdown && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50">
                  {AI_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => { setSelectedAI(provider.id); setShowAIDropdown(false) }}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
                        selectedAI === provider.id
                          ? 'bg-sage-50 dark:bg-sage-900/20 text-sage-700 dark:text-sage-300'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span>{provider.icon}</span>
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-xs text-gray-400">{provider.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Prompt Selector */}
            {!selectedPrompt && prompts.length > 0 && !generatedMessage && (
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Selecione um prompt:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {prompts.map((prompt) => {
                    const PromptIcon = getPromptIcon(prompt.icon)
                    const colorClass = getPromptColor(prompt.color)
                    return (
                      <button
                        key={prompt.id}
                        onClick={() => handleSelectPrompt(prompt)}
                        className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-sage-100/50 dark:border-sage-800/30 hover:border-sage-300 dark:hover:border-sage-600 hover:shadow-md transition-all text-left group"
                      >
                        <div className={`w-10 h-10 ${colorClass} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <PromptIcon className="text-white" size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{prompt.name}</p>
                          {prompt.description && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{prompt.description}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Selected Prompt Badge */}
            {selectedPrompt && (
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 ${getPromptColor(selectedPrompt.color)} bg-opacity-10 rounded-lg border border-sage-200 dark:border-sage-800`}>
                  {(() => { const Icon = getPromptIcon(selectedPrompt.icon); return <Icon size={14} className="text-sage-600" /> })()}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedPrompt.name}</span>
                  <button onClick={() => setSelectedPrompt(null)} className="ml-1 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Generated Message */}
            {(generatedMessage || generating) && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-sage-100/50 dark:border-sage-800/30 shadow-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-sage-100/50 dark:border-sage-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot size={16} className="text-sage-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Resposta</span>
                    {generating && <Loader2 className="animate-spin text-sage-500" size={14} />}
                  </div>
                  {generatedMessage && !generating && (
                    <div className="flex items-center gap-1">
                      <button onClick={handleCopy} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Copiar">
                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                      </button>
                      {!isEditing && (
                        <button onClick={handleStartEdit} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Editar">
                          <Pencil size={16} className="text-gray-400" />
                        </button>
                      )}
                      <button onClick={() => handleGenerate()} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Regenerar">
                        <RefreshCw size={16} className="text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  {isEditing ? (
                    <div>
                      <textarea
                        ref={messageRef}
                        value={editedMessage}
                        onChange={(e) => setEditedMessage(e.target.value)}
                        className="w-full min-h-[200px] p-3 border border-sage-200 dark:border-sage-800 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-400 outline-none resize-y font-mono text-sm"
                      />
                      <div className="flex gap-2 mt-3">
                        <button onClick={handleSaveEdit} className="px-4 py-2 bg-sage-500 text-white rounded-lg text-sm font-medium hover:bg-sage-600 transition-colors">
                          Salvar
                        </button>
                        <button onClick={() => { setIsEditing(false); setEditedMessage('') }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm transition-colors">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                      {generatedMessage}
                    </div>
                  )}
                </div>
              </div>
            )}

            {generateError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                {generateError}
              </div>
            )}

            {/* Empty State */}
            {!generatedMessage && !generating && prompts.length === 0 && (
              <div className="text-center py-16">
                <PageIcon size={48} className="text-sage-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Comece criando um prompt</h2>
                <p className="text-gray-400 mb-4">Configure as instruções do agente para este canal.</p>
                <button
                  onClick={() => router.push(promptsPath)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sage-500 to-sage-400 text-white font-semibold rounded-xl shadow-sage"
                >
                  <Settings size={16} />
                  Criar Prompt
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className="border-t border-sage-100/50 dark:border-sage-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={(e) => { e.preventDefault(); handleGenerate() }} className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleGenerate()
                  }
                }}
                placeholder={selectedPrompt ? `Escreva sua mensagem para ${selectedPrompt.name}...` : 'Selecione um prompt acima primeiro...'}
                rows={2}
                className="flex-1 px-4 py-3 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none resize-none text-sm"
              />
              <button
                type="submit"
                disabled={!topic.trim() || generating}
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-sage-500 to-sage-400 hover:from-sage-600 hover:to-sage-500 text-white rounded-xl shadow-sage disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
              >
                {generating ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
