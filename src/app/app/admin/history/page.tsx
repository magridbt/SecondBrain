'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  Calendar,
  Clock,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface Conversation {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  profiles?: {
    name: string
    email: string
  }
  messages?: Message[]
}

export default function HistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedConv, setExpandedConv] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState<string | null>(null)
  const supabase = createClient()

  const loadConversations = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        user_id,
        created_at,
        updated_at,
        profiles:user_id (
          name,
          email
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      // Transform data to match our interface (profiles comes as object, not array)
      const transformed = data.map((conv: any) => ({
        ...conv,
        profiles: conv.profiles || null
      }))
      setConversations(transformed as Conversation[])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const loadMessages = async (convId: string) => {
    if (expandedConv === convId) {
      setExpandedConv(null)
      return
    }

    setLoadingMessages(convId)
    setExpandedConv(convId)

    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === convId
            ? { ...conv, messages: data as Message[] }
            : conv
        )
      )
    }

    setLoadingMessages(null)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US')
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    const userName = conv.profiles?.name?.toLowerCase() || ''
    const userEmail = conv.profiles?.email?.toLowerCase() || ''
    const hasMatchingMessage = conv.messages?.some(
      msg => msg.content.toLowerCase().includes(searchLower)
    )
    return userName.includes(searchLower) ||
           userEmail.includes(searchLower) ||
           hasMatchingMessage
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageSquare className="w-8 h-8 text-gold-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Conversation History</h1>
            <p className="text-gray-500 dark:text-gray-400">View all user conversations and messages</p>
          </div>
        </div>
        <button
          onClick={loadConversations}
          className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
        >
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by user name, email or message content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Conversations List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gold-600" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No conversations found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConversations.map(conv => (
            <div
              key={conv.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Conversation Header */}
              <button
                onClick={() => loadMessages(conv.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-gold-200 to-gold-300 dark:from-gold-700 dark:to-gold-800 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-gold-700 dark:text-gold-300">
                      {conv.profiles?.name?.[0]?.toUpperCase() || conv.profiles?.email?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {conv.profiles?.name || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {conv.profiles?.email || conv.user_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(conv.updated_at || conv.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(conv.updated_at || conv.created_at)}</span>
                    </div>
                  </div>
                  {expandedConv === conv.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Messages */}
              {expandedConv === conv.id && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {loadingMessages === conv.id ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gold-600" />
                    </div>
                  ) : conv.messages && conv.messages.length > 0 ? (
                    <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                      {conv.messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${msg.role === 'user' ? 'justify-start' : 'justify-start'}`}
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            msg.role === 'user'
                              ? 'bg-blue-100 dark:bg-blue-900/50'
                              : 'bg-gold-100 dark:bg-gold-900/50'
                          }`}>
                            {msg.role === 'user' ? (
                              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Bot className="w-4 h-4 text-gold-600 dark:text-gold-400" />
                            )}
                          </div>
                          <div className={`flex-1 rounded-xl p-4 ${
                            msg.role === 'user'
                              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-medium ${
                                msg.role === 'user'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-gold-600 dark:text-gold-400'
                              }`}>
                                {msg.role === 'user' ? 'User' : 'Assistant'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDateTime(msg.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      No messages in this conversation
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
