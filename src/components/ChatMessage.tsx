'use client'

import { User, Sparkles, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Copy, Check, BookOpen } from 'lucide-react'
import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import DocumentModal from './DocumentModal'

interface Source {
  documentName: string
  documentId: string
  sourceName: string
  content: string
  score?: number
  similarity?: number
  similarityPercent?: number
  date?: string
  metadata?: any
  rank?: number
}

interface MessageProps {
  message: {
    id: string
    role: 'user' | 'assistant'
    content: string
    sources?: Source[]
  }
}

export default function ChatMessage({ message }: MessageProps) {
  const [showSources, setShowSources] = useState(false)
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const isUser = message.role === 'user'

  const handleOpenDocument = (documentId: string) => {
    setSelectedDocumentId(documentId)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setTimeout(() => setSelectedDocumentId(null), 300) // Clear after animation
  }

  const handleFeedback = async (type: 'like' | 'dislike') => {
    setFeedback(type)
    // Feedback is saved to /api/feedback endpoint
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.id,
          type,
          content: message.content,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error('Failed to save feedback:', error)
    }
  }

  const handleCopy = useCallback(async () => {
    try {
      // Remove markdown formatting for cleaner copy
      const cleanText = message.content
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic
        .replace(/#{1,6}\s/g, '')        // Remove headers
        .replace(/\n---\n/g, '\n\n')     // Replace hr with newlines
        .replace(/📖.*$/gm, '')          // Remove source lines
        .replace(/🎬.*$/gm, '')          // Remove YouTube lines
        .trim()

      await navigator.clipboard.writeText(cleanText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [message.content])

  return (
    <div className={`message-animate flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`
          w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
          ${isUser
            ? 'bg-gray-200 dark:bg-gray-700'
            : 'bg-gradient-to-br from-green-500 to-emerald-500'
          }
        `}
      >
        {isUser ? (
          <User className="text-gray-600 dark:text-gray-300" size={18} />
        ) : (
          <Sparkles className="text-white" size={18} />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`
            inline-block px-4 py-3 rounded-2xl
            ${isUser
              ? 'bg-green-500 text-white rounded-br-md'
              : 'bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-bl-md text-gray-800 dark:text-gray-200'
            }
          `}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="prose-spiritual dark:prose-invert">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources & Feedback (only for assistant) */}
        {!isUser && (
          <div className="mt-2 space-y-2">
            {/* Pure Search Results - Most relevant first, expandable others */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-4 space-y-3">
                {/* Primary Result - Always Visible, Highly Emphasized */}
                {(() => {
                  // Sort by similarity to get the most relevant first
                  const sortedSources = [...message.sources].sort(
                    (a, b) => (b.similarityPercent || b.similarity || 0) - (a.similarityPercent || a.similarity || 0)
                  )
                  const primarySource = sortedSources[0]
                  const otherSources = sortedSources.slice(1)
                  const similarityPercent = primarySource.similarityPercent || Math.round((primarySource.similarity || 0) * 100)

                  return (
                    <>
                      {/* Primary Card - Large, Highlighted */}
                      <div className="p-5 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/30 dark:via-green-950/30 dark:to-teal-950/30 rounded-xl border-2 border-emerald-300 dark:border-emerald-600/50 shadow-sm hover:shadow-md transition">
                        {/* Header with Relevance Badge */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">🏆</span>
                            <div>
                              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                Resultado Mais Relevante
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-bold text-emerald-900 dark:text-emerald-100">
                                  {primarySource.sourceName}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                              {similarityPercent}%
                            </div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">Compatibilidade</p>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 mb-3 text-sm text-gray-700 dark:text-gray-300 pb-3 border-b border-emerald-200 dark:border-emerald-700/50">
                          <div className="flex items-center gap-1">
                            <BookOpen size={14} className="text-emerald-600 dark:text-emerald-400" />
                            <span>{primarySource.documentName}</span>
                          </div>
                          {primarySource.date && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span>📅 {primarySource.date}</span>
                            </>
                          )}
                        </div>

                        {/* Content - Full text */}
                        <p className="text-gray-800 dark:text-gray-200 text-base leading-relaxed font-medium mb-3">
                          "{primarySource.content}"
                        </p>

                        {/* Action Button */}
                        <button
                          onClick={() => handleOpenDocument(primarySource.documentId)}
                          className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200 transition flex items-center gap-1"
                        >
                          <BookOpen size={14} />
                          Ler documento completo →
                        </button>
                      </div>

                      {/* Other Results - Collapsible */}
                      {otherSources.length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => setShowSources(!showSources)}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                          >
                            {showSources ? (
                              <>
                                <ChevronUp size={16} />
                                <span>Ocultar {otherSources.length} resultado(s)</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={16} />
                                <span>Ver {otherSources.length} outro(s) resultado(s) relevante(s)</span>
                              </>
                            )}
                          </button>

                          {showSources && (
                            <div className="mt-3 space-y-2">
                              {otherSources.map((source, i) => {
                                const otherSimilarityPercent = source.similarityPercent || Math.round((source.similarity || 0) * 100)
                                return (
                                  <div
                                    key={i}
                                    className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-sm transition"
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            #{i + 2} {source.sourceName}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                          {source.documentName}
                                          {source.date && ` • ${source.date}`}
                                        </p>
                                      </div>
                                      <div className="ml-3 text-right">
                                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                          {otherSimilarityPercent}%
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-3">
                                      "{source.content}"
                                    </p>
                                    <button
                                      onClick={() => handleOpenDocument(source.documentId)}
                                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition"
                                    >
                                      Ler documento completo →
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            {/* Document Modal */}
            {selectedDocumentId && (
              <DocumentModal
                documentId={selectedDocumentId}
                isOpen={modalOpen}
                onClose={handleCloseModal}
              />
            )}

            {/* Feedback & Copy */}
            <div className="flex items-center gap-2">
              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className={`p-1.5 rounded-lg transition ${
                  copied
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={copied ? 'Copied!' : 'Copy response'}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>

              <span className="text-gray-300 dark:text-gray-600">|</span>

              <span className="text-xs text-gray-400">Helpful?</span>
              <button
                onClick={() => handleFeedback('like')}
                className={`p-1.5 rounded-lg transition ${
                  feedback === 'like'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title="Yes, helpful"
              >
                <ThumbsUp size={14} />
              </button>
              <button
                onClick={() => handleFeedback('dislike')}
                className={`p-1.5 rounded-lg transition ${
                  feedback === 'dislike'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title="Not helpful"
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
