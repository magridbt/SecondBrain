'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, Menu, X, Search, Bot } from 'lucide-react'
import ChatMessage from '@/components/ChatMessage'
import ConversationSidebar, { SidebarItem, SidebarTheme } from '@/components/ConversationSidebar'

interface Source {
  documentName: string
  documentId: string
  sourceName: string
  content: string
  score?: number
  similarity?: number
  similarityPercent?: number
  date?: string
  metadata?: Record<string, unknown>
  rank?: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  searchQuery?: string
  created_at: string
  isStreaming?: boolean
}

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  messageCount: number
}

type ChatMode = 'search' | 'ai'

// Static theme question mappings for common themes
const themeQuestionsMap: Record<string, string[]> = {
  'Deeksha': [
    'O que é Deeksha e como ela funciona?',
    'Quais são os efeitos da Deeksha no cérebro?',
    'Como receber Deeksha à distância?',
    'Qual a diferença entre Deeksha e outras práticas espirituais?',
  ],
  'Iluminação': [
    'O que Sri Amma Bhagavan define como iluminação?',
    'Como alcançar a iluminação segundo os ensinamentos?',
    'Qual a diferença entre iluminação e despertar?',
    'A iluminação é possível para todos?',
  ],
  'Relacionamentos': [
    'Como melhorar os relacionamentos segundo Sri Amma Bhagavan?',
    'Qual o papel do relacionamento na jornada espiritual?',
    'Como lidar com conflitos nos relacionamentos?',
    'O que Sri Amma Bhagavan ensina sobre o amor nos relacionamentos?',
  ],
  'Sofrimento': [
    'Qual a causa raiz do sofrimento segundo os ensinamentos?',
    'Como transcender o sofrimento?',
    'O sofrimento tem algum propósito espiritual?',
    'Como lidar com o sofrimento emocional?',
  ],
  'Gratidão': [
    'Qual a importância da gratidão nos ensinamentos?',
    'Como praticar gratidão no dia a dia?',
    'A gratidão pode transformar a vida espiritual?',
    'Quais práticas de gratidão Sri Amma Bhagavan recomenda?',
  ],
  'Meditação': [
    'Quais meditações Sri Amma Bhagavan recomenda?',
    'Como meditar corretamente segundo os ensinamentos?',
    'Qual a diferença entre meditação e contemplação?',
    'A meditação é necessária para o despertar?',
  ],
}

const getThemeSuggestions = (themeName: string): string[] => [
  `O que Sri Amma Bhagavan ensina sobre ${themeName}?`,
  `Como praticar ${themeName} no dia a dia?`,
  `Qual a importância de ${themeName} nos ensinamentos?`,
  `Me conte um ensinamento sobre ${themeName}`,
]

function getThemeQuestions(themeName: string): string[] {
  if (themeQuestionsMap[themeName]) {
    return themeQuestionsMap[themeName]
  }
  return getThemeSuggestions(themeName)
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatMode, setChatMode] = useState<ChatMode>('search')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Theme state
  const [themes, setThemes] = useState<SidebarTheme[]>([])
  const [loadingThemes, setLoadingThemes] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<SidebarTheme | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadConversations()
    loadThemes()
  }, [])

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations')
      const data = await response.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoadingConversations(false)
    }
  }

  const loadThemes = async () => {
    setLoadingThemes(true)
    try {
      const response = await fetch('/api/themes')
      const data = await response.json()
      if (data.themes) {
        setThemes(data.themes)
      }
    } catch (error) {
      console.error('Error loading themes:', error)
    } finally {
      setLoadingThemes(false)
    }
  }

  const loadConversation = async (convId: string) => {
    setLoading(true)
    setSelectedTheme(null)
    try {
      const response = await fetch(`/api/conversations/${convId}`)
      const data = await response.json()
      if (data.messages) {
        setMessages(data.messages)
        setConversationId(convId)
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  const startNewChat = () => {
    setMessages([])
    setConversationId(null)
    setInput('')
    setSelectedTheme(null)
  }

  const deleteConversation = (convId: string) => {
    try {
      fetch(`/api/conversations?id=${convId}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (conversationId === convId) {
        startNewChat()
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  const renameConversation = async (convId: string, newTitle: string) => {
    const trimmed = newTitle.trim()
    if (!trimmed) return

    // Optimistic update
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, title: trimmed } : c)
    )

    try {
      await fetch(`/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      })
    } catch (error) {
      console.error('Error renaming conversation:', error)
      // Reload to revert on error
      loadConversations()
    }
  }

  const handleThemeClick = (theme: SidebarTheme) => {
    setSelectedTheme(theme)
    setMessages([])
    setConversationId(null)
    setInput(theme.name_pt)
  }

  // Map conversations to SidebarItem[]
  const sidebarItems: SidebarItem[] = conversations.map(conv => ({
    id: conv.id,
    title: conv.title,
    date: conv.updated_at,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setSelectedTheme(null)

    if (chatMode === 'ai') {
      await handleAIStream(userMessage)
    } else {
      await handleSearch(userMessage)
    }
  }

  // ========== MODO BUSCA (original) ==========
  const handleSearch = async (userMessage: Message) => {
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.content }),
      })

      if (!response.ok) throw new Error('Error searching documents')

      const data = await response.json()

      const assistantMessage: Message = {
        id: Date.now().toString() + '-assistant',
        role: 'assistant',
        content: data.totalResults > 0
          ? `Encontrei ${data.totalResults} resultado(s) relevante(s) para sua pergunta.`
          : 'Nenhum resultado encontrado. Tente reformular sua pergunta.',
        sources: data.results,
        searchQuery: userMessage.content,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Save conversation
      try {
        if (!conversationId) {
          const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [userMessage, assistantMessage] }),
          })
          if (res.ok) {
            const data = await res.json()
            setConversationId(data.conversation.id)
            loadConversations()
          }
        } else {
          await fetch(`/api/conversations/${conversationId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [userMessage, assistantMessage] }),
          })
        }
      } catch (e) {
        console.error('Save error:', e)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        created_at: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  // ========== MODO IA COM STREAMING ==========
  const handleAIStream = async (userMessage: Message) => {
    const assistantId = Date.now().toString() + '-assistant'

    // Add empty assistant message that will be filled via streaming
    setMessages((prev) => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      isStreaming: true,
    }])

    try {
      const controller = new AbortController()
      abortControllerRef.current = controller

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Erro ao conectar com IA')
      }

      // Check if it's a JSON response (no context found)
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        setMessages((prev) => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: data.answer, sources: data.sources || [], isStreaming: false }
            : m
        ))
        setLoading(false)
        return
      }

      // SSE streaming
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let buffer = ''

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

            if (event.type === 'sources') {
              setMessages((prev) => prev.map(m =>
                m.id === assistantId ? { ...m, sources: event.sources } : m
              ))
            } else if (event.type === 'text') {
              setMessages((prev) => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + event.text } : m
              ))
            } else if (event.type === 'done') {
              if (event.conversationId) {
                setConversationId(event.conversationId)
                loadConversations()
              }
              setMessages((prev) => prev.map(m =>
                m.id === assistantId ? { ...m, isStreaming: false } : m
              ))
            } else if (event.type === 'error') {
              setMessages((prev) => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: event.error || 'Erro ao gerar resposta', isStreaming: false }
                  : m
              ))
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Stream error:', error)
      setMessages((prev) => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Desculpe, ocorreu um erro. Tente novamente.', isStreaming: false }
          : m
      ))
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const defaultSuggestedQuestions = [
    'O que é Deeksha e como funciona?',
    'Como posso encontrar paz interior?',
    'Qual a importância da gratidão?',
    'Como lidar com o sofrimento?',
  ]

  const suggestedQuestions = selectedTheme
    ? getThemeQuestions(selectedTheme.name_pt)
    : defaultSuggestedQuestions

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <ConversationSidebar
        items={sidebarItems}
        activeId={conversationId}
        loading={loadingConversations}
        onSelect={loadConversation}
        onDelete={deleteConversation}
        onNew={startNewChat}
        onRename={renameConversation}
        open={sidebarOpen}
        width="w-72"
        colorTheme="green"
        searchable
        groupByDate
        renamable
        themes={themes}
        loadingThemes={loadingThemes}
        onThemeClick={handleThemeClick}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition text-gray-600 dark:text-gray-300"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              {selectedTheme ? (
                <span className="text-base">{selectedTheme.icon}</span>
              ) : (
                <Sparkles className="text-white" size={16} />
              )}
            </div>
            <div>
              <h1 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                {selectedTheme ? selectedTheme.name_pt : 'Ensinamentos Sri AB'}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedTheme
                  ? 'Explore este tema nos ensinamentos'
                  : 'Ensinamentos de Sri Amma Bhagavan'}
              </p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="ml-auto flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setChatMode('search')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                chatMode === 'search'
                  ? 'bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Search size={14} />
              Busca
            </button>
            <button
              onClick={() => setChatMode('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                chatMode === 'ai'
                  ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Bot size={14} />
              IA Claude
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-800">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl">{selectedTheme ? selectedTheme.icon : '\u{1F64F}'}</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
                {selectedTheme ? selectedTheme.name_pt : 'Namaste!'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                {selectedTheme
                  ? `Explore os ensinamentos de Sri Amma Bhagavan sobre ${selectedTheme.name_pt}. Escolha uma pergunta ou escreva a sua.`
                  : 'Sou Ensinamentos Sri AB, seu guia para os ensinamentos de Sri Amma Bhagavan. Faça sua pergunta e buscarei sabedoria nos ensinamentos originais.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestedQuestions.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(question)}
                    className="p-4 text-left bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition text-gray-700 dark:text-gray-300"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {loading && chatMode === 'search' && (
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="flex gap-1">
                    <span className="typing-dot w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="typing-dot w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="typing-dot w-2 h-2 bg-green-500 rounded-full"></span>
                  </div>
                  <span className="text-sm">Buscando nos ensinamentos...</span>
                </div>
              )}
              {loading && chatMode === 'ai' && !messages.some(m => m.isStreaming && m.content) && (
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="flex gap-1">
                    <span className="typing-dot w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className="typing-dot w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className="typing-dot w-2 h-2 bg-purple-500 rounded-full"></span>
                  </div>
                  <span className="text-sm">Claude está meditando nos ensinamentos...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-black border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Faça sua pergunta sobre os ensinamentos..."
                maxLength={5000}
                aria-label="Pergunta sobre os ensinamentos"
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition placeholder-gray-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Enviar pergunta"
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              As respostas são baseadas nos ensinamentos originais de Sri Amma Bhagavan
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
