'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, Plus, Trash2, MessageSquare, Menu, X } from 'lucide-react'
import ChatMessage from '@/components/ChatMessage'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: any[]
  created_at: string
}

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  messageCount: number
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Carregar lista de conversas
  useEffect(() => {
    loadConversations()
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
    if (!confirm('Are you sure you want to delete this conversation?')) return

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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
        }),
      })

      if (!response.ok) {
        throw new Error('Error sending message')
      }

      const data = await response.json()

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
        // Recarregar lista de conversas para incluir a nova
        loadConversations()
      }

      const assistantMessage: Message = {
        id: Date.now().toString() + '-assistant',
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: 'Sorry, an error occurred. Please try again.',
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const suggestedQuestions = [
    'What is Deeksha and how does it work?',
    'How can I find inner peace?',
    'What is the importance of gratitude?',
    'How to deal with suffering?',
  ]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US')
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'w-72' : 'w-0'}
        bg-white dark:bg-black border-r border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden flex-shrink-0
      `}>
        <div className="flex flex-col h-full w-72">
          {/* New Chat Button */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition shadow-sm"
            >
              <Plus size={18} />
              <span className="font-medium">New chat</span>
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 px-2">
              History
            </p>
            {loadingConversations ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-gray-400" size={20} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No conversations yet
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
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-500'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <MessageSquare size={16} className={`flex-shrink-0 ${conversationId === conv.id ? 'text-green-600 dark:text-green-500' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">{conv.title}</p>
                      <p className="text-xs text-gray-400">{formatDate(conv.updated_at)}</p>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                      title="Delete conversation"
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
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <Sparkles className="text-white" size={16} />
            </div>
            <div>
              <h1 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Sri AB Teachings</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Teachings of Sri Amma Bhagavan</p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-800">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl">🙏</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
                Namaste!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                I am Sri AB Teachings, your guide to the teachings of Sri Amma Bhagavan.
                Ask your question and I will search for wisdom in the original teachings.
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
              {loading && (
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="flex gap-1">
                    <span className="typing-dot w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="typing-dot w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="typing-dot w-2 h-2 bg-green-500 rounded-full"></span>
                  </div>
                  <span className="text-sm">Searching the teachings...</span>
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
                placeholder="Ask your question about the teachings..."
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition placeholder-gray-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
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
              Answers are based on the original teachings of Sri Amma Bhagavan
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
