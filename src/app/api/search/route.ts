import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { semanticSearch, SearchResult } from '@/lib/semantic-search'
import { chatRateLimiter, getRateLimitHeaders } from '@/lib/ratelimit'

// Portuguese only
const LANGUAGE = 'pt'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const { success, limit, remaining, reset } = await chatRateLimiter.limit(user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait a few minutes.' },
        {
          status: 429,
          headers: getRateLimitHeaders({ limit, remaining, reset })
        }
      )
    }

    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
    }

    // Perform semantic search - NO CLAUDE, JUST RESULTS
    let searchResults: SearchResult[] = []
    try {
      // Get 12 best results with minimum 35% threshold (industry standard for semantic search)
      searchResults = await semanticSearch(query, 12, 0.35, LANGUAGE)
    } catch (searchError) {
      console.error('Semantic search failed')
      // Return empty results if search fails
      searchResults = []
    }

    // Deduplicate: keep best result per document
    const seenDocuments = new Map<string, SearchResult>()
    for (const result of searchResults) {
      const existing = seenDocuments.get(result.documentId)
      if (!existing || (result.similarity || 0) > (existing.similarity || 0)) {
        seenDocuments.set(result.documentId, result)
      }
    }
    const dedupedResults = Array.from(seenDocuments.values())
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))

    // Format results for frontend
    const formattedResults = dedupedResults.map((result, index) => ({
      rank: index + 1,
      id: result.id,
      documentId: result.documentId,
      documentName: result.documentName,
      sourceName: result.sourceName,
      content: result.content,
      similarity: result.similarity,
      similarityPercent: Math.round((result.similarity || 0) * 100),
      metadata: result.metadata,
      date: result.metadata?.darshan_date
        ? new Date(String(result.metadata.darshan_date)).toLocaleDateString('pt-BR')
        : undefined,
    }))

    return NextResponse.json(
      {
        query,
        searchQuery: query, // Pass query to frontend for keyword highlighting
        totalResults: formattedResults.length,
        results: formattedResults,
        mode: 'semantic_search', // Indicate this is pure search, not Claude-processed
        minSimilarity: '35%', // Indicate minimum threshold applied
      },
      {
        headers: getRateLimitHeaders({ limit, remaining, reset })
      }
    )

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
