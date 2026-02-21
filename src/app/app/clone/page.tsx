'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Plus, Trash2, MessageSquare, Menu, X, Dna } from 'lucide-react'
import ChatMessage from '@/components/ChatMessage'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: any[]
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

export default function ClonePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations?module=clone_cognitivo')
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

  const loadConversation = async (convId: string) => {
    setLoading(true)
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
  }

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Tem certeza que quer deletar esta conversa?')) return

    try {
      await fetch(`/api/conversations?id=${convId}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (conversationId === convId) {
        startNewChat()
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

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

    await handleCloneStream(userMessage)
  }

  const handleCloneStream = async (userMessage: Message) => {
    const assistantId = Date.now().toString() + '-assistant'

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

      const response = await fetch('/api/chat/clone/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Erro ao conectar com o Clone')
      }

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
          } catch (e) {
            // Skip malformed events
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
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

  const suggestedQuestions = [
    'O que e o eu separado?',
    'Estou sofrendo muito, como posso encontrar paz?',
    'Como posso despertar?',
    'O que e a graca e como ela funciona?',
  ]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `${diffDays} dias atrás`
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="flex h-full">
      {/* Conversations Sidebar */}
      <div className={`
        ${sidebarOpen ? 'w-72' : 'w-0'}
        bg-white dark:bg-black border-r border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden flex-shrink-0
      `}>
        <div className="flex flex-col h-full w-72">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition shadow-sm"
            >
              <Plus size={18} />
              <span className="font-medium">Nova conversa</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 px-2">
              Histórico
            </p>
            {loadingConversations ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-gray-400" size={20} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Nenhuma conversa ainda
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`
                      group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition
                      ${conversationId === conv.id
                        ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <MessageSquare size={16} className={`flex-shrink-0 ${conversationId === conv.id ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">{conv.title}</p>
                      <p className="text-xs text-gray-400">{formatDate(conv.updated_at)}</p>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                      title="Deletar conversa"
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
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
              <Dna className="text-white" size={16} />
            </div>
            <div>
              <h1 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Sri Amma Bhagavan</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Clone Cognitivo - DNA Mental Completo</p>
            </div>
          </div>

          <div className="ml-auto flex items-center bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-1.5">
            <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Clone Ativo</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-800">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Dna className="text-white" size={36} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
                Namaste
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Eu sou Sri Amma Bhagavan. Pergunte-me qualquer coisa sobre consciencia,
                despertar, sofrimento, ou a natureza da realidade. Estou aqui para ajuda-lo
                a ver o que ja e verdade.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestedQuestions.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(question)}
                    className="p-4 text-left bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition text-gray-700 dark:text-gray-300"
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
              {loading && !messages.some(m => m.isStreaming && m.content) && (
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="flex gap-1">
                    <span className="typing-dot w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className="typing-dot w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className="typing-dot w-2 h-2 bg-purple-500 rounded-full"></span>
                  </div>
                  <span className="text-sm">Sri Amma Bhagavan esta presente...</span>
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
                placeholder="Fale com Sri Amma Bhagavan..."
                maxLength={5000}
                aria-label="Mensagem para Sri Amma Bhagavan"
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition placeholder-gray-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Enviar mensagem"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              Respostas geradas como clone cognitivo de Sri Amma Bhagavan baseado em 950+ horas de ensinamentos
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
