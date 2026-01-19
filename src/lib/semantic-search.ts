import { createAdminClient } from '@/lib/supabase/server'

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
      input_type: 'query', // Important: use 'query' for search queries, not 'document'
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()

    // If rate limited, wait and try again
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

// Search for relevant chunks using vector similarity
export async function semanticSearch(
  query: string,
  limit: number = 5,
  similarityThreshold: number = 0.3,
  language?: string | null
): Promise<SearchResult[]> {
  const adminClient = createAdminClient()

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query)

    // Convert embedding array to PostgreSQL vector format string
    const embeddingStr = `[${queryEmbedding.join(',')}]`

    // Use the existing search_teachings function in the database
    const { data: chunks, error } = await adminClient.rpc('search_teachings', {
      query_embedding: embeddingStr,
      match_threshold: similarityThreshold,
      match_count: limit,
      filter_language: language || null
    })

    if (error) {
      console.error('Semantic search error:', error)
      // Fallback to text search if vector search fails
      return fallbackTextSearch(adminClient, query, limit, language)
    }

    if (!chunks || chunks.length === 0) {
      console.log('No semantic results, trying text search')
      // Fallback to text search if no results
      return fallbackTextSearch(adminClient, query, limit, language)
    }

    return chunks.map((chunk: any) => ({
      id: chunk.chunk_id,
      content: chunk.content,
      documentId: chunk.document_id,
      documentName: chunk.document_name,
      sourceName: chunk.source_name,
      similarity: chunk.similarity,
      metadata: chunk.metadata
    }))
  } catch (error) {
    console.error('Semantic search failed:', error)
    return fallbackTextSearch(adminClient, query, limit, language)
  }
}

// Fallback text search when vector search fails or returns no results
async function fallbackTextSearch(
  client: any,
  query: string,
  limit: number,
  language?: string | null
): Promise<SearchResult[]> {
  console.log('Using fallback text search', language ? `(language: ${language})` : '(all languages)')

  try {
    // Simple text search using ilike
    const searchTerms = query.split(' ').filter(t => t.length > 2).slice(0, 5)

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
      .or(searchTerms.map(term => `content.ilike.%${term}%`).join(','))
      .eq('documents.status', 'indexed')
      .is('documents.deleted_at', null)
      .eq('documents.teaching_sources.is_active', true)

    // Filter by language if specified
    if (language) {
      queryBuilder = queryBuilder.eq('documents.metadata->>language', language)
    }

    const { data: chunks, error } = await queryBuilder.limit(limit)

    if (error || !chunks) {
      console.error('Fallback search error:', error)
      return []
    }

    return chunks.map((chunk: any) => ({
      id: chunk.id,
      content: chunk.content,
      documentId: chunk.documents?.id || chunk.document_id,
      documentName: chunk.documents?.name || 'Unknown',
      sourceName: chunk.documents?.teaching_sources?.name || 'Unknown',
      similarity: 0.5, // Default similarity for text search
      metadata: chunk.metadata
    }))
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
