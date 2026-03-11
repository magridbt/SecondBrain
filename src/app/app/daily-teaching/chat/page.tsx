'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Menu, X, Filter, Leaf } from 'lucide-react'
import DailyTeachingChatMessage from '@/components/DailyTeachingChatMessage'
import ConversationSidebar, { SidebarItem } from '@/components/ConversationSidebar'
import { useChat, type ChatMessage } from '@/hooks/useChat'
import { useToast } from '@/components/Toast'

interface Theme {
  id: string
  slug: string
  name_pt: string
  name_en: string
  name_es: string | null
  icon: string
  color: string
}

const SUGGESTED_QUESTIONS = [
  'What is the teaching for today?',
  'How can I practice gratitude?',
  'What is the meaning of suffering?',
  'How to find inner peace?',
]

export default function DailyTeachingChatPage() {
  const [input, setInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [themes, setThemes] = useState<Theme[]>([])
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [showThemeFilter, setShowThemeFilter] = useState(false)
  const [directQuoteMode, setDirectQuoteMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { showToast } = useToast()

  const {
    messages,
    loading,
    conversationId,
    conversations,
    loadingConversations,
    sendMessage,
    loadConversations,
    loadConversation,
    deleteConversation,
    startNewChat,
    submitFeedback,
    submitFidelityFeedback,
  } = useChat({
    module: 'daily-teaching',
    onError: (error) => {
      showToast(error.message || 'An unexpected error occurred', 'error')
    },
  })

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const loadThemes = useCallback(async () => {
    try {
      const response = await fetch('/api/themes')
      const data = await response.json()
      if (data.themes) {
        setThemes(data.themes)
      }
    } catch (error) {
      console.error('Error loading themes:', error)
    }
  }, [])

  useEffect(() => {
    loadConversations()
    loadThemes()
  }, [loadConversations, loadThemes])

  const toggleTheme = (slug: string) => {
    setSelectedThemes((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]
    )
  }

  const clearThemeFilter = () => {
    setSelectedThemes([])
  }

  // ─── Sidebar item mapping ─────────────────────────────────
  const sidebarItems: SidebarItem[] = conversations.map((conv) => ({
    id: conv.id,
    title: conv.title,
    date: conv.updated_at,
  }))

  const handleSidebarDelete = async (id: string) => {
    const success = await deleteConversation(id)
    if (success) {
      showToast('Conversation deleted successfully', 'success')
    } else {
      showToast('Failed to delete conversation', 'error')
    }
  }

  const handleSidebarRename = async (id: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      if (!response.ok) throw new Error('Failed to rename')
      // Refresh conversations list to reflect the change
      await loadConversations()
    } catch (error) {
      console.error('Error renaming conversation:', error)
      showToast('Failed to rename conversation', 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const messageContent = input.trim()
    setInput('')

    await sendMessage(messageContent, {
      themes: selectedThemes.length > 0 ? selectedThemes : undefined,
      directQuoteMode,
    })
  }

  const handleSuggestedQuestion = async (question: string) => {
    setInput(question)
    await sendMessage(question, {
      themes: selectedThemes.length > 0 ? selectedThemes : undefined,
      directQuoteMode,
    })
  }

  const handleSearchTopic = async (topic: string) => {
    await sendMessage(topic, {
      themes: selectedThemes.length > 0 ? selectedThemes : undefined,
      directQuoteMode,
    })
  }

  const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
    const success = await submitFeedback(messageId, feedback)
    if (success) {
      showToast('Thank you! Your feedback has been recorded', 'success')
    }
  }

  const handleFidelityFeedback = async (
    messageId: string,
    fidelity: 'faithful' | 'partial' | 'unfaithful'
  ) => {
    const success = await submitFidelityFeedback(messageId, fidelity)
    if (success) {
      showToast('Thank you! Your fidelity feedback has been recorded', 'success')
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <ConversationSidebar
        items={sidebarItems}
        activeId={conversationId}
        loading={loadingConversations}
        onSelect={loadConversation}
        onDelete={handleSidebarDelete}
        onNew={startNewChat}
        onRename={handleSidebarRename}
        open={sidebarOpen}
        width="w-72"
        colorTheme="sage"
        newButtonText="Nova conversa"
        searchable={true}
        groupByDate={true}
        renamable={true}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-sage-100/50 dark:border-sage-800/30">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 hover:bg-sage-50 dark:hover:bg-sage-900/20 rounded-xl transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-sage-600 dark:hover:text-sage-400"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-gradient-to-br from-sage-400 to-sage-600 rounded-2xl flex items-center justify-center shadow-sage">
                <Leaf className="text-white" size={18} />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 dark:text-gray-100 text-sm tracking-tight">
                  Daily Teaching Chat
                </h1>
                <p className="text-xs text-sage-600 dark:text-sage-400 font-medium">
                  Explore the teachings interactively
                </p>
              </div>
            </div>
            {/* Direct Quote Mode Toggle */}
            <button
              onClick={() => setDirectQuoteMode(!directQuoteMode)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                directQuoteMode
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-700/30 ring-2 ring-purple-400/50'
                  : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
              }`}
              title={directQuoteMode ? 'Direct Quote Mode ACTIVE' : 'Enable Direct Quote Mode'}
            >
              <span>📜</span>
              <span className="hidden sm:inline">{directQuoteMode ? 'Direct Quote' : 'Quotes'}</span>
            </button>

            {/* Theme Filter Toggle */}
            <button
              onClick={() => setShowThemeFilter(!showThemeFilter)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                selectedThemes.length > 0
                  ? 'bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-400 border border-sage-200/50 dark:border-sage-700/30'
                  : 'hover:bg-sage-50 dark:hover:bg-sage-900/20 text-gray-600 dark:text-gray-400 hover:text-sage-600 dark:hover:text-sage-400'
              }`}
            >
              <Filter size={16} />
              <span className="hidden sm:inline">
                {selectedThemes.length > 0 ? `${selectedThemes.length} theme(s)` : 'Filter'}
              </span>
            </button>
          </div>

          {/* Theme Filter Panel */}
          {showThemeFilter && themes.length > 0 && (
            <div className="px-4 py-4 border-t border-sage-100/50 dark:border-sage-800/30 bg-sage-50/30 dark:bg-sage-900/10 animate-fadeIn">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Filter by theme
                </span>
                {selectedThemes.length > 0 && (
                  <button
                    onClick={clearThemeFilter}
                    className="text-xs text-sage-600 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.slug}
                    onClick={() => toggleTheme(theme.slug)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedThemes.includes(theme.slug)
                        ? 'text-white shadow-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-sage-100/50 dark:border-sage-700/30 hover:border-sage-300 dark:hover:border-sage-600'
                    }`}
                    style={
                      selectedThemes.includes(theme.slug) ? { backgroundColor: theme.color } : undefined
                    }
                  >
                    <span>{theme.icon}</span>
                    <span>{theme.name_en}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-gray-800 dark:to-gray-900">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-12 animate-fadeIn">
              <div className="w-24 h-24 bg-gradient-to-br from-sage-400 to-sage-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-sage-lg">
                <Leaf className="text-white" size={40} />
              </div>
              <h2 className="text-3xl font-black tracking-tighter text-gray-800 dark:text-gray-100 mb-3">
                Daily Teaching Chat
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-10 text-lg">
                Explore the teachings of Sri Amma Bhagavan through an interactive conversation. Ask
                questions and discover wisdom.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SUGGESTED_QUESTIONS.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="p-5 text-left bg-white dark:bg-gray-900 border border-sage-100/50 dark:border-sage-800/30 rounded-2xl hover:border-sage-300 dark:hover:border-sage-600 hover:bg-sage-50/30 dark:hover:bg-sage-900/20 transition-all duration-200 text-gray-700 dark:text-gray-300 font-medium shadow-sm hover:shadow-sage"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <DailyTeachingChatMessage
                  key={message.id}
                  message={message}
                  onSearchTopic={handleSearchTopic}
                  onFeedback={handleFeedback}
                  onFidelityFeedback={handleFidelityFeedback}
                />
              ))}
              {loading && (
                <div className="flex items-center gap-3 text-sage-600 dark:text-sage-400 animate-fadeIn">
                  <div className="flex gap-1.5">
                    <span className="typing-dot w-2.5 h-2.5 bg-sage-500 rounded-full"></span>
                    <span className="typing-dot w-2.5 h-2.5 bg-sage-500 rounded-full"></span>
                    <span className="typing-dot w-2.5 h-2.5 bg-sage-500 rounded-full"></span>
                  </div>
                  <span className="text-sm font-medium">Searching the teachings...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-sage-100/50 dark:border-sage-800/30 p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your question about the teachings..."
                className="flex-1 px-5 py-4 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl focus:ring-2 focus:ring-sage-400 dark:focus:ring-sage-600 focus:border-transparent outline-none transition-all duration-300 placeholder-gray-400 shadow-sm"
                disabled={loading}
                maxLength={2000}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-4 bg-gradient-to-r from-sage-500 to-sage-400 hover:from-sage-600 hover:to-sage-500 text-white rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sage hover:shadow-sage-lg transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {loading ? <Loader2 className="animate-spin" size={22} /> : <Send size={22} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3 font-medium">
              Answers are based on the original teachings of Sri Amma Bhagavan
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
