'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Menu, X, Dna } from 'lucide-react'
import ChatMessage from '@/components/ChatMessage'
import ConversationSidebar, { SidebarItem } from '@/components/ConversationSidebar'

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

  const handleDeleteConversation = useCallback(async (convId: string) => {
    try {
      await fetch(`/api/conversations?id=${convId}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (conversationId === convId) {
        startNewChat()
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }, [conversationId])

  const handleRenameConversation = useCallback(async (convId: string, newTitle: string) => {
    // Optimistic update
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, title: newTitle } : c)
    )
    try {
      const response = await fetch(`/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      if (!response.ok) {
        // Revert on failure
        loadConversations()
      }
    } catch (error) {
      console.error('Error renaming conversation:', error)
      loadConversations()
    }
  }, [])

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

  // Map conversations to SidebarItem[]
  const sidebarItems: SidebarItem[] = conversations.map(conv => ({
    id: conv.id,
    title: conv.title,
    date: conv.updated_at,
  }))

  return (
    <div className="flex h-full">
      {/* Conversations Sidebar */}
      <ConversationSidebar
        items={sidebarItems}
        activeId={conversationId}
        loading={loadingConversations}
        onSelect={loadConversation}
        onDelete={handleDeleteConversation}
        onNew={startNewChat}
        onRename={handleRenameConversation}
        open={sidebarOpen}
        width="w-72"
        colorTheme="purple"
        newButtonText="Nova conversa"
        searchable={true}
        groupByDate={true}
        renamable={true}
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
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
              <Dna className="text-white" size={16} />
            </div>
            <div>
              <h1 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Sri Amma Bhagavan</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Clone Cognitivo - DNA Mental Completo</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-1.5" title="Respostas geradas por IA com base no DNA dos ensinamentos de Sri Amma Bhagavan">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-400">DNA Mental • IA</span>
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
              Baseado no DNA dos ensinamentos de Sri Amma Bhagavan • Respostas geradas por IA
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
