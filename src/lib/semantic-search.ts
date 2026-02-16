// ============================================================================
// VERSÃO OTIMIZADA - semantic-search.ts
// Pronto para usar search_teachings_optimized no Supabase
// ============================================================================

import { createAdminClient } from '@/lib/supabase/server'
import {
  normalizeText,
  calculateFuzzyScore,
  fuzzyFind,
  findFuzzyKeywordsInContent,
  enhanceQueryWithFuzzyMatches
} from '@/lib/fuzzy-search'
import { getCachedEmbedding, setCachedEmbedding } from '@/lib/embedding-cache'

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-2'

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Generate embedding for a query using Voyage AI
export async function generateQueryEmbedding(query: string, retryCount = 0): Promise<number[]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: [query],
      input_type: 'query',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()

    if (response.status === 429 && retryCount < 3) {
      console.log(`Rate limit hit, waiting 3 seconds... (attempt ${retryCount + 1})`)
      await delay(3000)
      return generateQueryEmbedding(query, retryCount + 1)
    }

    throw new Error(`Voyage AI error: ${errorText}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

// ============================================================================
// VERSÃO OTIMIZADA - Usa search_teachings_optimized
// ============================================================================
export async function semanticSearch(
  query: string,
  limit: number = 8,
  similarityThreshold: number = 0.70,
  language?: string | null
): Promise<SearchResult[]> {
  const adminClient = createAdminClient()

  try {
    const fuzzyEnhanced = enhanceQueryWithFuzzyMatches(query)
    console.log('Query analysis:', {
      original: fuzzyEnhanced.original,
      normalized: fuzzyEnhanced.normalized,
      variations: fuzzyEnhanced.variations.length
    })

    // Try cache first, then generate embedding
    let queryEmbedding = await getCachedEmbedding(fuzzyEnhanced.normalized).catch(() => null)
    if (!queryEmbedding) {
      queryEmbedding = await generateQueryEmbedding(fuzzyEnhanced.normalized)
      // Cache for future use (fire and forget)
      setCachedEmbedding(fuzzyEnhanced.normalized, queryEmbedding).catch(() => {})
    } else {
      console.log('📦 Embedding cache HIT')
    }
    const embeddingStr = `[${queryEmbedding.join(',')}]`

    console.log(`🔍 Semantic Search (OPTIMIZED): "${query}" - Threshold: ${(similarityThreshold * 100).toFixed(0)}%`)

    // ============================================================================
    // TRY: Use optimized function first
    // ============================================================================
    let chunks: any[] | null = null
    let error: any = null

    try {
      const result = await adminClient.rpc('search_teachings_optimized', {
        query_embedding: embeddingStr,
        match_threshold: similarityThreshold,
        match_count: limit,
        filter_language: language || null
      })

      chunks = result.data
      error = result.error

      if (!error) {
        console.log(`✅ OPTIMIZED SEARCH: Found ${chunks?.length || 0} results`)
      }
    } catch (optimizedError) {
      console.warn('⚠️  Optimized function not available yet, using fallback...')
      error = optimizedError
    }

    // ============================================================================
    // FALLBACK: Use original function if optimized not available
    // ============================================================================
    if (error || !chunks) {
      console.log('📊 Falling back to original search_teachings...')

      const fallbackResult = await adminClient.rpc('search_teachings', {
        query_embedding: embeddingStr,
        match_threshold: similarityThreshold,
        match_count: limit,
        filter_language: language || null
      })

      chunks = fallbackResult.data
      error = fallbackResult.error

      if (!error) {
        console.log(`✅ FALLBACK SEARCH: Found ${chunks?.length || 0} results`)
      }
    }

    if (error) {
      const errorMsg = `VECTOR_SEARCH_ERROR: ${error.message || error}`
      console.error('Semantic search error:', errorMsg)
      console.warn('⚠️  Vector search failed - falling back to fuzzy text search')

      const results = await fallbackTextSearch(adminClient, query, limit, language)
      return results.map((r: any) => ({ ...r, fallbackMode: 'vector_search_error' }))
    }

    if (!chunks || chunks.length === 0) {
      console.warn('🔍 NO_VECTOR_RESULTS: No results found above threshold')
      console.log(`📝 Query: "${query}"`)
      console.log(`📊 Threshold: ${(similarityThreshold * 100).toFixed(1)}%`)

      const results = await fallbackTextSearch(adminClient, query, limit, language)
      return results.map((r: any) => ({ ...r, fallbackMode: 'no_vector_matches' }))
    }

    // ============================================================================
    // MAP RESULTS
    // ============================================================================
    return chunks.map((chunk: any) => ({
      id: chunk.chunk_id,
      content: chunk.content,
      documentId: chunk.document_id,
      documentName: chunk.document_name,
      sourceName: chunk.source_name,
      similarity: chunk.similarity, // Now using optimized ranking
      metadata: chunk.metadata
    }))

  } catch (error) {
    console.error('Semantic search failed:', error)
    return fallbackTextSearch(adminClient, query, limit, language)
  }
}

// ============================================================================
// FALLBACK TEXT SEARCH (unchanged)
// ============================================================================
async function fallbackTextSearch(
  client: any,
  query: string,
  limit: number,
  language?: string | null
): Promise<SearchResult[]> {
  console.log('Using fallback text search with fuzzy matching', language ? `(language: ${language})` : '(all languages)')

  try {
    const fuzzyEnhanced = enhanceQueryWithFuzzyMatches(query)
    const normalizedQuery = fuzzyEnhanced.normalized
    const searchTerms = normalizedQuery
      .split(/\s+/)
      .filter(t => t.length > 2)
      .slice(0, 5)

    if (searchTerms.length === 0) {
      return []
    }

    let queryBuilder = client
      .from('document_chunks')
      .select(`
        id,
        content,
        metadata,
        document_id,
        documents!inner (
          id,
          name,
          status,
          deleted_at,
          metadata,
          teaching_sources!inner (
            id,
            name,
            is_active
          )
        )
      `)
      .eq('documents.status', 'indexed')
      .is('documents.deleted_at', null)
      .eq('documents.teaching_sources.is_active', true)

    if (language) {
      queryBuilder = queryBuilder.eq('documents.metadata->>language', language)
    }

    let { data: chunks, error } = await queryBuilder
      .or(searchTerms.map(term => `content.ilike.%${term}%`).join(','))
      .limit(limit)

    if (error) {
      console.error('Fallback search error:', error)
      chunks = []
    }

    if (chunks && chunks.length > 0) {
      const scoredResults = chunks.map((chunk: any) => {
        let fuzzyScore = 0.5

        const contentLower = chunk.content.toLowerCase()
        for (const term of searchTerms) {
          const termScore = calculateFuzzyScore(term, contentLower.substring(0, 100))
          fuzzyScore = Math.max(fuzzyScore, termScore)
        }

        return {
          id: chunk.id,
          content: chunk.content,
          documentId: chunk.documents?.id || chunk.document_id,
          documentName: chunk.documents?.name || 'Unknown',
          sourceName: chunk.documents?.teaching_sources?.name || 'Unknown',
          similarity: fuzzyScore,
          metadata: chunk.metadata,
          isFuzzyMatch: true
        }
      })

      return scoredResults
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, limit)
    }

    console.log('No exact matches found, trying fuzzy matching across all content...')

    const { data: allChunks, error: allError } = await client
      .from('document_chunks')
      .select(`
        id,
        content,
        metadata,
        document_id,
        documents!inner (
          id,
          name,
          status,
          deleted_at,
          metadata,
          teaching_sources!inner (
            id,
            name,
            is_active
          )
        )
      `)
      .eq('documents.status', 'indexed')
      .is('documents.deleted_at', null)
      .eq('documents.teaching_sources.is_active', true)
      .limit(100)

    if (allError || !allChunks) {
      return []
    }

    const fuzzyResults = allChunks
      .map((chunk: any) => {
        const keywords = findFuzzyKeywordsInContent(query, chunk.content, 0.65)
        const fuzzyScore = keywords.length > 0
          ? Math.max(...keywords.map(k => k.score))
          : 0

        return {
          id: chunk.id,
          content: chunk.content,
          documentId: chunk.documents?.id || chunk.document_id,
          documentName: chunk.documents?.name || 'Unknown',
          sourceName: chunk.documents?.teaching_sources?.name || 'Unknown',
          similarity: fuzzyScore,
          metadata: chunk.metadata,
          isFuzzyMatch: fuzzyScore > 0
        }
      })
      .filter((result: any) => result.similarity > 0.5)
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit)

    if (fuzzyResults.length > 0) {
      console.log(`Found ${fuzzyResults.length} results using fuzzy matching`)
      return fuzzyResults
    }

    return []
  } catch (error) {
    console.error('Fallback search failed:', error)
    return []
  }
}

export interface SearchResult {
  id: string
  content: string
  documentId: string
  documentName: string
  sourceName: string
  similarity: number
  metadata?: any
}
