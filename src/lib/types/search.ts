/**
 * Type definitions for semantic search
 */

// Database row types
export interface TeachingSource {
  id: string
  name: string
  is_active: boolean
}

export interface Document {
  id: string
  name: string
  status: string
  deleted_at: string | null
  metadata: Record<string, unknown>
  source_id: string
  teaching_sources: TeachingSource | TeachingSource[]
}

// Supabase returns nested relations in different formats depending on query
// Using a flexible type that handles both single objects and arrays
export interface DocumentChunkRaw {
  id: string
  content: string
  metadata: Record<string, unknown>
  document_id: string
  documents: Document | Document[]
}

// Normalized document chunk after processing
export interface DocumentChunk {
  id: string
  content: string
  metadata: Record<string, unknown>
  document_id: string
  documents?: {
    id: string
    name: string
    status: string
    deleted_at: string | null
    metadata: Record<string, unknown>
    source_id: string
    teaching_sources?: {
      id: string
      name: string
      is_active: boolean
    }
  }
}

export interface DocumentChunkWithScore extends DocumentChunk {
  relevanceScore: number
}

export interface DocumentTheme {
  document_id: string
  themes: {
    slug: string
  }
}

// Search result types
export interface SearchResult {
  id: string
  content: string
  documentId: string
  documentName: string
  sourceName: string
  similarity: number
  metadata?: Record<string, unknown>
  themes?: string[]
}

export interface SemanticSearchResponse {
  results: SearchResult[]
  searchTerms: string[]
}

// Voyage AI response types
export interface VoyageEmbeddingResponse {
  data: Array<{
    embedding: number[]
  }>
}
