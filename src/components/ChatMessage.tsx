'use client'

import { User, Sparkles, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'

interface Source {
  documentName: string
  sourceName: string
  content: string
  score?: number
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
  const isUser = message.role === 'user'

  const handleFeedback = async (type: 'like' | 'dislike') => {
    setFeedback(type)
    // TODO: Save feedback to database
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
            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div>
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
                >
                  {showSources ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  <span>{message.sources.length} source(s)</span>
                </button>

                {showSources && (
                  <div className="mt-2 space-y-2">
                    {message.sources.map((source, i) => (
                      <div
                        key={i}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 text-sm"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {source.sourceName}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500 dark:text-gray-400">{source.documentName}</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 line-clamp-3">{source.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
