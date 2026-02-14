'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Loader2, BookOpen, ChevronUp, ChevronDown, Search } from 'lucide-react'
import { highlightKeywords } from '@/lib/highlight-utils'

interface DocumentContent {
  id: string
  name: string
  source: string
  date?: string
  content: string
  metadata?: any
  chunkCount: number
}

interface DocumentModalProps {
  documentId: string
  isOpen: boolean
  onClose: () => void
  searchQuery?: string
}

export default function DocumentModal({ documentId, isOpen, onClose, searchQuery }: DocumentModalProps) {
  const [loading, setLoading] = useState(false)
  const [document, setDocument] = useState<DocumentContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [highlightCount, setHighlightCount] = useState(0)
  const [currentHighlight, setCurrentHighlight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !documentId) return

    fetchDocument()
  }, [isOpen, documentId])

  // Count highlights and auto-scroll to first one after document loads
  useEffect(() => {
    if (!document || loading || !contentRef.current) return

    // Wait for DOM to render the highlighted content
    const timer = setTimeout(() => {
      const marks = contentRef.current?.querySelectorAll('mark')
      const count = marks?.length || 0
      setHighlightCount(count)
      setCurrentHighlight(count > 0 ? 1 : 0)

      // Auto-scroll to first highlight
      if (count > 0 && marks && marks[0]) {
        marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [document, loading])

  const navigateHighlight = useCallback((direction: 'prev' | 'next') => {
    if (!contentRef.current || highlightCount === 0) return

    const marks = contentRef.current.querySelectorAll('mark')
    let newIndex = currentHighlight

    if (direction === 'next') {
      newIndex = currentHighlight < highlightCount ? currentHighlight + 1 : 1
    } else {
      newIndex = currentHighlight > 1 ? currentHighlight - 1 : highlightCount
    }

    setCurrentHighlight(newIndex)

    const targetMark = marks[newIndex - 1]
    if (targetMark) {
      targetMark.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentHighlight, highlightCount])

  const fetchDocument = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${documentId}/content`)

      if (!response.ok) {
        throw new Error('Falha ao carregar documento')
      }

      const data = await response.json()
      setDocument(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar documento')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 flex-1">
            <BookOpen className="text-emerald-600 dark:text-emerald-400" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {document?.name || 'Carregando...'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {document?.source} {document?.date && `• ${document.date}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            title="Fechar"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Highlight Navigation Bar */}
        {searchQuery && highlightCount > 0 && (
          <div className="flex items-center gap-3 px-6 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
            <Search size={16} className="text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
              {highlightCount} ocorrencia(s) encontrada(s) para "{searchQuery}"
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {currentHighlight}/{highlightCount}
              </span>
              <button
                onClick={() => navigateHighlight('prev')}
                className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded transition"
                title="Anterior"
              >
                <ChevronUp size={16} className="text-amber-600 dark:text-amber-400" />
              </button>
              <button
                onClick={() => navigateHighlight('next')}
                className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded transition"
                title="Proximo"
              >
                <ChevronDown size={16} className="text-amber-600 dark:text-amber-400" />
              </button>
            </div>
          </div>
        )}

        {searchQuery && !loading && document && highlightCount === 0 && (
          <div className="flex items-center gap-3 px-6 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <Search size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">
              Nenhuma ocorrencia exata de "{searchQuery}" neste documento (resultado encontrado por similaridade semantica)
            </span>
          </div>
        )}

        {/* Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-400 mr-2" size={24} />
              <span className="text-gray-600 dark:text-gray-400">Carregando documento...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {document && !loading && (
            <div className="prose dark:prose-invert max-w-none">
              <div
                ref={contentRef}
                className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: searchQuery
                    ? highlightKeywords(document.content, searchQuery)
                    : document.content
                }}
              />

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                Documento contem {document.chunkCount} segmento(s)
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
