'use client'

import { useState, useCallback, useRef } from 'react'

interface FidelityInfo {
  score: number
  isValid: boolean
  warnings?: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: any[]
  searchTerms?: string[]
  fidelity?: FidelityInfo
  directQuoteMode?: boolean
  created_at: string
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  messageCount: number
}

interface UseChatOptions {
  module: 'sri-ab-teachings' | 'daily-teaching'
  onError?: (error: Error) => void
  onSuccess?: (message: ChatMessage) => void
}

interface SendMessageOptions {
  themes?: string[]
  directQuoteMode?: boolean
}

export function useChat({ module, onError, onSuccess }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true)
    try {
      const response = await fetch(`/api/conversations?module=${module}`)
      const data = await response.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      onError?.(error as Error)
    } finally {
      setLoadingConversations(false)
    }
  }, [module, onError])

  const loadConversation = useCallback(async (convId: string) => {
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
      onError?.(error as Error)
    } finally {
      setLoading(false)
    }
  }, [onError])

  const sendMessage = useCallback(async (
    content: string,
    options: SendMessageOptions = {}
  ): Promise<ChatMessage | null> => {
    if (!content.trim() || loading) return null

    // Cancel any pending request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          themes: options.themes,
          directQuoteMode: options.directQuoteMode,
          module,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
        loadConversations()
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        searchTerms: data.searchTerms,
        fidelity: data.fidelity,
        directQuoteMode: data.directQuoteMode,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      onSuccess?.(assistantMessage)
      return assistantMessage
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null
      }

      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, an error occurred. Please try again.',
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
      onError?.(error as Error)
      return null
    } finally {
      setLoading(false)
    }
  }, [loading, conversationId, module, loadConversations, onError, onSuccess])

  const deleteConversation = useCallback(async (convId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/conversations?id=${convId}`, { method: 'DELETE' })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete conversation')
      }

      setConversations((prev) => prev.filter((c) => c.id !== convId))

      if (conversationId === convId) {
        setMessages([])
        setConversationId(null)
      }

      return true
    } catch (error) {
      console.error('Error deleting conversation:', error)
      onError?.(error as Error)
      return false
    }
  }, [conversationId, onError])

  const startNewChat = useCallback(() => {
    abortControllerRef.current?.abort()
    setMessages([])
    setConversationId(null)
  }, [])

  const submitFeedback = useCallback(async (
    messageId: string,
    feedback: 'like' | 'dislike'
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          feedback,
          conversationId,
          module,
        }),
      })

      return response.ok
    } catch (error) {
      console.error('Error submitting feedback:', error)
      return false
    }
  }, [conversationId, module])

  const submitFidelityFeedback = useCallback(async (
    messageId: string,
    fidelity: 'faithful' | 'partial' | 'unfaithful'
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/feedback/fidelity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          fidelity,
          conversationId,
          module,
        }),
      })

      return response.ok
    } catch (error) {
      console.error('Error submitting fidelity feedback:', error)
      return false
    }
  }, [conversationId, module])

  return {
    // State
    messages,
    loading,
    conversationId,
    conversations,
    loadingConversations,

    // Actions
    sendMessage,
    loadConversations,
    loadConversation,
    deleteConversation,
    startNewChat,
    submitFeedback,
    submitFidelityFeedback,

    // Setters for external control
    setMessages,
    setConversationId,
  }
}
