-- Drop the old search_teachings that has (vector, double precision, integer, text) signature
-- This conflicts with the new one because PostgREST can't distinguish between them
DROP FUNCTION IF EXISTS public.search_teachings(vector, double precision, integer, text);

-- Recreate clean version
CREATE OR REPLACE FUNCTION search_teachings(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5,
  filter_language TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_name VARCHAR,
  source_name VARCHAR,
  source_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    d.id AS document_id,
    d.name AS document_name,
    ts.name AS source_name,
    ts.id AS source_id,
    dc.content,
    dc.metadata,
    (1 - (dc.embedding <=> query_embedding))::float AS similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  JOIN teaching_sources ts ON d.source_id = ts.id
  WHERE d.status = 'indexed'
    AND d.deleted_at IS NULL
    AND ts.is_active = true
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
    AND (filter_language IS NULL OR d.metadata->>'language' = filter_language OR d.metadata->>'language' IS NULL)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
