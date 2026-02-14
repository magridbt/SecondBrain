-- Drop ALL existing versions of search functions to avoid overload conflicts
DROP FUNCTION IF EXISTS search_teachings(vector, float, int);
DROP FUNCTION IF EXISTS search_teachings(vector, float, int, text);
DROP FUNCTION IF EXISTS search_teachings(vector, double precision, integer);
DROP FUNCTION IF EXISTS search_teachings(vector, double precision, integer, text);
DROP FUNCTION IF EXISTS search_teachings_optimized(vector, float, int, text);
DROP FUNCTION IF EXISTS search_teachings_optimized(vector, double precision, integer, text);

-- Recreate search_teachings with filter_language support
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

-- Recreate search_teachings_optimized with correct JOIN and return types
CREATE OR REPLACE FUNCTION search_teachings_optimized(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5,
  filter_language TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  content TEXT,
  document_id UUID,
  document_name TEXT,
  source_name TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    dc.content AS content,
    d.id AS document_id,
    d.name::text AS document_name,
    ts.name::text AS source_name,
    (
      (1 - (dc.embedding <=> query_embedding)) *
      CASE
        WHEN (1 - (dc.embedding <=> query_embedding)) > 0.95 THEN 1.15
        WHEN (1 - (dc.embedding <=> query_embedding)) > 0.85 THEN 1.08
        ELSE 1.0
      END
    )::float AS similarity,
    dc.metadata AS metadata
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  JOIN teaching_sources ts ON d.source_id = ts.id
  WHERE
    (1 - (dc.embedding <=> query_embedding)) >= match_threshold
    AND d.status = 'indexed'
    AND d.deleted_at IS NULL
    AND ts.is_active = true
    AND (filter_language IS NULL OR d.metadata->>'language' = filter_language OR d.metadata->>'language' IS NULL)
  ORDER BY
    (1 - (dc.embedding <=> query_embedding)) *
    CASE
      WHEN (1 - (dc.embedding <=> query_embedding)) > 0.95 THEN 1.15
      WHEN (1 - (dc.embedding <=> query_embedding)) > 0.85 THEN 1.08
      ELSE 1.0
    END DESC,
    LENGTH(dc.content) DESC
  LIMIT match_count;
END;
$$;
