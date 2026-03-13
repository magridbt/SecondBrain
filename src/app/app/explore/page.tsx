'use client'

import { useState } from 'react'
import { Search, Loader2, BookOpen, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface SearchResult {
  rank: number
  id: string
  documentId: string
  documentName: string
  sourceName: string
  content: string
  similarity: number
  similarityPercent: number
  metadata?: {
    darshan_date?: string
    youtube_url?: string
    language?: string
    [key: string]: unknown
  }
  date?: string
}

export default function ExplorePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    setError(null)
    setSearched(false)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro na busca')
      }

      const data = await res.json()
      setResults(data.results || [])
      setSearched(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const getSimilarityColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
    if (pct >= 65) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
    return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 dark:text-gray-100 tracking-tight">Explorar Ensinamentos</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Busca semântica direta na base de conhecimento
            </p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar nos ensinamentos... (ex: graça divina, impotência, despertar)"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
              Buscar
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Busca semântica — encontra ensinamentos por significado, não só palavras exatas. Sem geração de IA.
          </p>
        </form>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {searched && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {results.length > 0
                  ? `${results.length} ensinamento${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''} para "${query}"`
                  : `Nenhum ensinamento encontrado para "${query}"`}
              </p>
              {results.length > 0 && (
                <span className="text-xs text-gray-400">mín. 50% relevância</span>
              )}
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                <BookOpen size={48} className="mx-auto mb-4 opacity-40" />
                <p className="text-lg font-medium mb-1">Nenhum resultado encontrado</p>
                <p className="text-sm">Tente reformular sua busca com outras palavras</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => {
                  const isExpanded = expandedId === result.id
                  return (
                    <div
                      key={result.id}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-shadow hover:shadow-md"
                    >
                      {/* Result Header */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : result.id)}
                        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getSimilarityColor(result.similarityPercent)}`}>
                              {result.similarityPercent}% relevante
                            </span>
                            <span className="text-xs text-gray-400">#{result.rank}</span>
                            {result.date && (
                              <span className="text-xs text-gray-400">{result.date}</span>
                            )}
                          </div>
                          <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">
                            {result.documentName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {result.sourceName}
                          </p>
                          {!isExpanded && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                              {result.content}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-gray-400 mt-1">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {result.content}
                          </p>
                          {result.metadata?.youtube_url && (
                            <a
                              href={result.metadata.youtube_url as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-3 text-xs text-red-600 dark:text-red-400 hover:underline"
                            >
                              <ExternalLink size={12} />
                              Assistir no YouTube
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!searched && !loading && (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <Search size={56} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">Explore os ensinamentos</p>
            <p className="text-sm max-w-sm mx-auto">
              Digite um tema, palavra ou frase para encontrar os trechos mais relevantes na base de conhecimento
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
