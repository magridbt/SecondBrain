'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download, FileText, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface DocumentData {
  id: string
  name: string
  storage_path: string
  storage_url: string
  metadata: {
    language?: string
    darshan_date?: string
    program_year?: string
  }
  chunks: {
    id: string
    content: string
    chunk_index: number
  }[]
}

export default function DocumentViewerPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const documentId = params.id as string
  const highlightText = searchParams.get('highlight') || ''
  const chunkId = searchParams.get('chunk') || ''

  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0)

  useEffect(() => {
    loadDocument()
  }, [documentId])

  useEffect(() => {
    // Find and scroll to the highlighted chunk
    if (document && chunkId) {
      const chunkIndex = document.chunks.findIndex(c => c.id === chunkId)
      if (chunkIndex !== -1) {
        setActiveChunkIndex(chunkIndex)
        // Scroll to the chunk
        setTimeout(() => {
          const element = window.document.getElementById(`chunk-${chunkId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [document, chunkId])

  const loadDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}`)
      if (!response.ok) {
        throw new Error('Failed to load document')
      }
      const data = await response.json()
      setDocument(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading document')
    } finally {
      setLoading(false)
    }
  }

  // Highlight search terms in text
  const highlightContent = (content: string) => {
    if (!highlightText) return content

    const terms = highlightText.split(' ').filter(t => t.length > 2)
    if (terms.length === 0) return content

    const pattern = new RegExp(`(${terms.join('|')})`, 'gi')
    const parts = content.split(pattern)

    return parts.map((part, i) => {
      const isMatch = terms.some(t => t.toLowerCase() === part.toLowerCase())
      if (isMatch) {
        return (
          <mark key={i} className="bg-yellow-300 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100 px-1 rounded font-medium">
            {part}
          </mark>
        )
      }
      return part
    })
  }

  // Download document content as text file
  const handleDownload = () => {
    if (!document) return

    // Combine all chunks into one text
    const content = document.chunks
      .sort((a, b) => a.chunk_index - b.chunk_index)
      .map(chunk => chunk.content)
      .join('\n\n---\n\n')

    // Create header with metadata
    const header = `${document.name}
${document.metadata?.darshan_date ? `Data: ${new Date(document.metadata.darshan_date).toLocaleDateString('pt-BR')}` : ''}
${document.metadata?.language ? `Idioma: ${document.metadata.language.toUpperCase()}` : ''}

${'='.repeat(60)}

`

    const fullContent = header + content

    // Create and download file
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = `${document.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-gold-500" size={40} />
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <FileText className="text-gray-400" size={60} />
        <p className="text-gray-500">{error || 'Document not found'}</p>
        <Link href="/app/chat" className="text-gold-600 hover:text-gold-700 font-medium">
          ← Voltar ao Chat
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-b border-gold-100/50 dark:border-gold-800/30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/app/chat"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Voltar ao Chat</span>
            </Link>

            <div className="flex-1 text-center">
              <h1 className="font-bold text-gray-800 dark:text-gray-100 text-sm sm:text-base truncate">
                📖 {document.name}
              </h1>
              {document.metadata?.darshan_date && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(document.metadata.darshan_date).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 rounded-xl hover:bg-gold-200 dark:hover:bg-gold-900/50 transition-colors text-sm font-medium"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>

          {/* Search indicator */}
          {highlightText && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
              <Search size={16} className="text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                Destacando: <strong>{highlightText}</strong>
              </span>
            </div>
          )}

          {/* Chunk navigation */}
          <div className="mt-3 flex items-center justify-between text-sm">
            <button
              onClick={() => setActiveChunkIndex(Math.max(0, activeChunkIndex - 1))}
              disabled={activeChunkIndex === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
            <span className="text-gray-500 dark:text-gray-400">
              Seção {activeChunkIndex + 1} de {document.chunks.length}
            </span>
            <button
              onClick={() => setActiveChunkIndex(Math.min(document.chunks.length - 1, activeChunkIndex + 1))}
              disabled={activeChunkIndex === document.chunks.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Próximo
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {document.chunks.map((chunk, index) => (
            <div
              key={chunk.id}
              id={`chunk-${chunk.id}`}
              className={`p-6 rounded-2xl border-2 transition-all ${
                chunk.id === chunkId
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 shadow-lg'
                  : index === activeChunkIndex
                  ? 'bg-white dark:bg-gray-800 border-gold-200 dark:border-gold-700 shadow-md'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                  Seção {index + 1}
                </span>
                {chunk.id === chunkId && (
                  <span className="px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded-full font-medium">
                    ⭐ Resultado da busca
                  </span>
                )}
              </div>
              <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {highlightContent(chunk.content)}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
