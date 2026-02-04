-- ============================================================================
-- VECTOR SIMILARITY SEARCH FUNCTION
-- Uses cosine similarity for semantic search on document embeddings
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS match_documents_v2(vector(1024), float, int, text, uuid[]);

-- Create optimized vector search function
CREATE OR REPLACE FUNCTION match_documents_v2(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5,
  filter_language text DEFAULT NULL,
  filter_theme_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  document_id uuid,
  document_name text,
  document_metadata jsonb,
  source_id uuid,
  source_name text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.metadata,
    dc.document_id,
    d.name as document_name,
    d.metadata as document_metadata,
    d.source_id,
    ts.name as source_name,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  INNER JOIN documents d ON dc.document_id = d.id
  INNER JOIN teaching_sources ts ON d.source_id = ts.id
  LEFT JOIN document_themes dt ON d.id = dt.document_id
  WHERE
    d.status = 'indexed'
    AND d.deleted_at IS NULL
    AND ts.is_active = true
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (filter_language IS NULL OR d.metadata->>'language' = filter_language)
    AND (filter_theme_ids IS NULL OR dt.theme_id = ANY(filter_theme_ids))
  GROUP BY dc.id, dc.content, dc.metadata, dc.document_id, d.name, d.metadata, d.source_id, ts.name, dc.embedding
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_documents_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION match_documents_v2 TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION match_documents_v2 IS 'Semantic vector search using cosine similarity. Returns documents ordered by relevance with similarity scores between 0 and 1.';
