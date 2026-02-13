'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, BookOpen } from 'lucide-react'

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
}

export default function DocumentModal({ documentId, isOpen, onClose }: DocumentModalProps) {
  const [loading, setLoading] = useState(false)
  const [document, setDocument] = useState<DocumentContent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !documentId) return

    fetchDocument()
  }, [isOpen, documentId])

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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-400 mr-2" size={24} />
              <span className="text-gray-600 dark:text-gray-400">Carregando documento...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
              ❌ {error}
            </div>
          )}

          {document && !loading && (
            <div className="prose dark:prose-invert max-w-none">
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {document.content}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                📊 Documento contém {document.chunkCount} segmento(s)
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
