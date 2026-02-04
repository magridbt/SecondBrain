'use client'

import { User, Leaf, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Copy, Check, Search, BookOpen, ExternalLink } from 'lucide-react'
import { useState, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'

interface Source {
  id?: string
  documentId?: string
  documentName: string
  sourceName: string
  content: string
  score?: number
  similarity?: number
  metadata?: {
    darshan_date?: string
    program_year?: string
    youtube_url?: string
    language?: string
  }
}

interface FidelityInfo {
  score: number
  isValid: boolean
  warnings?: string[]
}

interface MessageProps {
  message: {
    id: string
    role: 'user' | 'assistant'
    content: string
    sources?: Source[]
    searchTerms?: string[]
    fidelity?: FidelityInfo
    directQuoteMode?: boolean
  }
  onSearchTopic?: (topic: string) => void
  onFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void
  onFidelityFeedback?: (messageId: string, feedback: 'faithful' | 'partial' | 'unfaithful') => void
}

const TOPIC_PATTERNS: { pattern: RegExp; topic: string; icon: string }[] = [
  { pattern: /\b(alegria|joy|felicidade|happiness|feliz|happy|bem-aventuran[çc]a|bliss|ananda)\b/gi, topic: 'Alegria', icon: '😊' },
  { pattern: /\b(ilumina[çc][ãa]o|enlighten\w*|awakening|despertar)\b/gi, topic: 'Iluminação', icon: '✨' },
  { pattern: /\b(deeksha|diksha)\b/gi, topic: 'Deeksha', icon: '🙏' },
  { pattern: /\b(karma|carma|samskara)\b/gi, topic: 'Karma', icon: '♻️' },
  { pattern: /\b(sofrimento|suffering|sofrer)\b/gi, topic: 'Sofrimento', icon: '💔' },
  { pattern: /\b(tristeza|sadness|triste|sad)\b/gi, topic: 'Tristeza', icon: '😢' },
  { pattern: /\b(m[áa]goa|magoar?|hurt|ressentimento|resentment)\b/gi, topic: 'Mágoa', icon: '💔' },
  { pattern: /\b(raiva|anger|irritado|angry)\b/gi, topic: 'Raiva', icon: '😠' },
  { pattern: /\b(medo|fear|temor|afraid)\b/gi, topic: 'Medo', icon: '😨' },
  { pattern: /\b(ansiedade|anxiety|ansioso)\b/gi, topic: 'Ansiedade', icon: '😰' },
  { pattern: /\b(culpa|guilt|vergonha|shame)\b/gi, topic: 'Culpa', icon: '😔' },
  { pattern: /\b(relacionamento|relationship|casamento|marriage)\b/gi, topic: 'Relacionamentos', icon: '💑' },
  { pattern: /\b(fam[íi]lia|family)\b/gi, topic: 'Família', icon: '👨‍👩‍👧‍👦' },
  { pattern: /\b(sa[úu]de|health|cura|healing|doen[çc]a)\b/gi, topic: 'Saúde', icon: '🏥' },
  { pattern: /\b(dinheiro|money|financeiro|financial|riqueza|wealth|prosperidade)\b/gi, topic: 'Finanças', icon: '💰' },
  { pattern: /\b(medita[çc][ãa]o|meditation)\b/gi, topic: 'Meditação', icon: '🧘' },
  { pattern: /\b(gratid[ãa]o|gratitude|agrade[çc]\w*)\b/gi, topic: 'Gratidão', icon: '🙏' },
  { pattern: /\b(deus|god|divino|divine|sagrado)\b/gi, topic: 'Deus', icon: '🙏' },
  { pattern: /\b(mente|mind)\b/gi, topic: 'Mente', icon: '🧠' },
  { pattern: /\b(pensamento|thought|pensar)\b/gi, topic: 'Pensamento', icon: '💭' },
  { pattern: /\b(amor|love)\b/gi, topic: 'Amor', icon: '❤️' },
  { pattern: /\b(paz|peace|tranquil\w*)\b/gi, topic: 'Paz', icon: '☮️' },
  { pattern: /\b(transforma[çc][ãa]o|transformation|transformar)\b/gi, topic: 'Transformação', icon: '🦋' },
  { pattern: /\b(liberdade|freedom|livre|free)\b/gi, topic: 'Liberdade', icon: '🕊️' },
]

function extractTopics(content: string): { topic: string; icon: string }[] {
  const found = new Set<string>()
  const topics: { topic: string; icon: string }[] = []

  for (const { pattern, topic, icon } of TOPIC_PATTERNS) {
    if (pattern.test(content) && !found.has(topic)) {
      found.add(topic)
      topics.push({ topic, icon })
    }
    pattern.lastIndex = 0
  }

  return topics.slice(0, 5)
}

function highlightKeywords(text: string, keywords: string[]): React.ReactNode {
  if (!keywords.length) return text

  const escapedKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, 'gi')
  const parts = text.split(pattern)

  return parts.map((part, i) => {
    const isKeyword = keywords.some(k => k.toLowerCase() === part.toLowerCase())
    if (isKeyword) {
      return (
        <mark key={i} className="bg-sage-200 dark:bg-sage-800/50 text-sage-800 dark:text-sage-200 px-0.5 rounded">
          {part}
        </mark>
      )
    }
    return part
  })
}

export default function DailyTeachingChatMessage({ message, onSearchTopic, onFeedback, onFidelityFeedback }: MessageProps) {
  const [showSources, setShowSources] = useState(true)
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null)
  const [fidelityFeedback, setFidelityFeedback] = useState<'faithful' | 'partial' | 'unfaithful' | null>(null)
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const getFidelityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
  }

  const getFidelityLabel = (score: number) => {
    if (score >= 80) return 'High Fidelity'
    if (score >= 60) return 'Moderate Fidelity'
    return 'Check Sources'
  }

  const relatedTopics = useMemo(() => {
    if (!message.sources?.length) return []
    const allContent = message.sources.map(s => s.content).join(' ')
    return extractTopics(allContent)
  }, [message.sources])

  const highlightWords = useMemo(() => {
    if (message.searchTerms && message.searchTerms.length > 0) {
      return message.searchTerms.slice(0, 10)
    }

    const words: string[] = []
    for (const { pattern } of TOPIC_PATTERNS) {
      const sources = message.sources || []
      for (const source of sources) {
        const matches = source.content.match(pattern)
        if (matches) {
          matches.forEach(m => {
            if (!words.includes(m.toLowerCase())) {
              words.push(m.toLowerCase())
            }
          })
        }
      }
      if (words.length > 0) break
    }
    return words.slice(0, 10)
  }, [message.sources, message.searchTerms])

  const handleFeedback = async (type: 'like' | 'dislike') => {
    setFeedback(type)
    if (onFeedback) {
      onFeedback(message.id, type)
    }
  }

  const handleFidelityFeedback = async (type: 'faithful' | 'partial' | 'unfaithful') => {
    setFidelityFeedback(type)
    if (onFidelityFeedback) {
      onFidelityFeedback(message.id, type)
    }
  }

  const handleTopicClick = (topic: string) => {
    if (onSearchTopic) {
      onSearchTopic(topic)
    }
  }

  const handleCopy = useCallback(async () => {
    try {
      const cleanText = message.content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/\n---\n/g, '\n\n')
        .replace(/📖.*$/gm, '')
        .replace(/🎬.*$/gm, '')
        .trim()

      await navigator.clipboard.writeText(cleanText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [message.content])

  return (
    <div
      className={`message-animate flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
      role="article"
      aria-label={isUser ? 'Your message' : 'Assistant response'}
    >
      {/* Avatar */}
      <div
        className={`
          w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm
          ${isUser
            ? 'bg-gradient-to-br from-sage-200 to-sage-300 dark:from-sage-700 dark:to-sage-800'
            : 'bg-gradient-to-br from-sage-400 to-sage-600 shadow-sage'
          }
        `}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="text-sage-700 dark:text-sage-300" size={18} />
        ) : (
          <Leaf className="text-white" size={18} />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`
            inline-block px-5 py-3.5 rounded-2xl
            ${isUser
              ? 'bg-gradient-to-r from-sage-500 to-sage-400 text-white rounded-br-md shadow-sage'
              : 'bg-white dark:bg-gray-900 border border-sage-100/50 dark:border-sage-800/30 rounded-bl-md text-gray-800 dark:text-gray-200 shadow-lg'
            }
          `}
          style={!isUser ? { boxShadow: '0 8px 30px -12px rgba(34, 197, 94, 0.15)' } : {}}
        >
          {isUser ? (
            <p className="font-medium">{message.content}</p>
          ) : (
            <div className="prose-spiritual dark:prose-invert">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources & Feedback (only for assistant) */}
        {!isUser && (
          <div className="mt-3 space-y-2">
            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-sage-700 dark:text-sage-400">
                    <BookOpen size={16} />
                    {message.sources.length} Paragraph(s) Found
                  </h4>
                  <button
                    onClick={() => setShowSources(!showSources)}
                    className="text-xs text-gray-500 hover:text-sage-600 dark:hover:text-sage-400 flex items-center gap-1"
                  >
                    {showSources ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showSources ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showSources && (
                  <div className="space-y-4 animate-fadeIn">
                    {message.sources.map((source, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-br from-sage-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-sage-200/50 dark:border-sage-700/30 overflow-hidden shadow-lg"
                      >
                        {/* Header */}
                        <div className="bg-sage-100/50 dark:bg-sage-900/30 px-4 py-3 border-b border-sage-200/30 dark:border-sage-700/20">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="font-bold text-sage-800 dark:text-sage-300 text-base">
                                📖 {source.documentName}
                              </h5>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {source.sourceName}
                                </span>
                                {source.metadata?.darshan_date && (
                                  <span className="text-xs text-gray-500 dark:text-gray-500">
                                    • 📅 {new Date(source.metadata.darshan_date).toLocaleDateString('en-US', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </span>
                                )}
                                {source.similarity && (
                                  <span className="px-2 py-0.5 bg-sage-200 dark:bg-sage-800/50 text-sage-700 dark:text-sage-400 text-xs rounded-full font-medium">
                                    {Math.round(source.similarity * 100)}% relevant
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <div className="text-gray-800 dark:text-gray-200 leading-relaxed text-base whitespace-pre-wrap">
                            {highlightKeywords(source.content, highlightWords)}
                          </div>

                          {/* Action Links */}
                          <div className="flex flex-wrap gap-2 mt-4">
                            {source.documentId && (
                              <Link
                                href={`/app/document/${source.documentId}?chunk=${source.id || ''}&highlight=${encodeURIComponent(highlightWords.slice(0, 3).join(' '))}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-sage-50 dark:bg-sage-900/20 text-sage-700 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-900/30 rounded-xl text-sm font-medium transition-colors border border-sage-200/50 dark:border-sage-700/30"
                              >
                                <ExternalLink size={14} />
                                View in document
                              </Link>
                            )}

                            {source.metadata?.youtube_url && (
                              <a
                                href={source.metadata.youtube_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl text-sm font-medium transition-colors"
                              >
                                🎬 Watch on YouTube
                              </a>
                            )}
                          </div>

                          {/* Related Topics */}
                          {(() => {
                            const sourceTopics = extractTopics(source.content)
                            if (sourceTopics.length === 0) return null
                            return (
                              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-sage-100/50 dark:border-sage-700/20">
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Search size={12} />
                                  Search more about:
                                </span>
                                {sourceTopics.map(({ topic, icon }, j) => (
                                  <button
                                    key={j}
                                    onClick={() => handleTopicClick(topic)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-sage-100 dark:hover:bg-sage-900/50 text-gray-700 dark:text-gray-300 hover:text-sage-700 dark:hover:text-sage-400 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-600 hover:border-sage-300 dark:hover:border-sage-600 transition-all shadow-sm"
                                    title={`Search for "${topic}"`}
                                  >
                                    <span>{icon}</span>
                                    <span>{topic}</span>
                                  </button>
                                ))}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* General Related Topics */}
            {relatedTopics.length > 0 && !showSources && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <Search size={12} />
                  Topics:
                </span>
                {relatedTopics.map(({ topic, icon }, i) => (
                  <button
                    key={i}
                    onClick={() => handleTopicClick(topic)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-sage-50 dark:bg-sage-900/30 hover:bg-sage-100 dark:hover:bg-sage-900/50 text-sage-700 dark:text-sage-400 text-xs font-medium rounded-full border border-sage-200/50 dark:border-sage-700/30 transition-all duration-200 hover:scale-105"
                    title={`Search for "${topic}"`}
                  >
                    <span>{icon}</span>
                    <span>{topic}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Fidelity Score Badge */}
            {message.fidelity && (
              <div className="flex items-center gap-2 mb-2">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getFidelityColor(message.fidelity.score)}`}>
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  <span>{getFidelityLabel(message.fidelity.score)}</span>
                  <span className="opacity-70">({message.fidelity.score}%)</span>
                </div>
                {message.directQuoteMode && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium">
                    📜 Quote Mode
                  </span>
                )}
              </div>
            )}

            {/* Fidelity Feedback */}
            <div className="flex flex-wrap items-center gap-2 mb-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                🙏 Is this response faithful to the original teaching?
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleFidelityFeedback('faithful')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    fidelityFeedback === 'faithful'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-2 ring-green-500'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  ✓ Yes, faithful
                </button>
                <button
                  onClick={() => handleFidelityFeedback('partial')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    fidelityFeedback === 'partial'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 ring-2 ring-yellow-500'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  ~ Partially
                </button>
                <button
                  onClick={() => handleFidelityFeedback('unfaithful')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    fidelityFeedback === 'unfaithful'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-2 ring-red-500'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  ✗ Not faithful
                </button>
              </div>
            </div>

            {/* Feedback & Copy */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  copied
                    ? 'bg-sage-100 dark:bg-sage-900/30 text-sage-600 dark:text-sage-400'
                    : 'text-gray-400 hover:text-sage-600 dark:hover:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-900/20'
                }`}
                title={copied ? 'Copied!' : 'Copy response'}
                aria-label={copied ? 'Response copied to clipboard' : 'Copy response to clipboard'}
              >
                {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
              </button>

              <span className="text-sage-200 dark:text-sage-700" aria-hidden="true">|</span>

              <span className="text-xs text-gray-400 font-medium" id="feedback-label">Helpful?</span>
              <div role="group" aria-labelledby="feedback-label" className="flex items-center gap-1">
                <button
                  onClick={() => handleFeedback('like')}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    feedback === 'like'
                      ? 'bg-sage-100 dark:bg-sage-900/30 text-sage-600 dark:text-sage-400'
                      : 'text-gray-400 hover:text-sage-600 dark:hover:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-900/20'
                  }`}
                  title="Yes, helpful"
                  aria-label="Mark as helpful"
                  aria-pressed={feedback === 'like'}
                >
                  <ThumbsUp size={15} aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleFeedback('dislike')}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    feedback === 'dislike'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                  title="Not helpful"
                  aria-label="Mark as not helpful"
                  aria-pressed={feedback === 'dislike'}
                >
                  <ThumbsDown size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
