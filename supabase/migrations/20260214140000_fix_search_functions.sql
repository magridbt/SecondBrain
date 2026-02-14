-- Fix search_teachings: add filter_language parameter and include docs without language metadata
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
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  JOIN teaching_sources ts ON d.source_id = ts.id
  WHERE d.status = 'indexed'
    AND d.deleted_at IS NULL
    AND ts.is_active = true
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (filter_language IS NULL OR d.metadata->>'language' = filter_language OR d.metadata->>'language' IS NULL)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix search_teachings_optimized: fix JOIN (source_id not teaching_sources_id) + include docs without language
CREATE OR REPLACE FUNCTION search_teachings_optimized(
  query_embedding vector,
  match_threshold float,
  match_count int,
  filter_language text
) RETURNS TABLE (
  chunk_id uuid,
  content text,
  document_id uuid,
  document_name text,
  source_name text,
  similarity float,
  metadata jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_results AS (
    SELECT
      dc.id as chunk_id,
      dc.content,
      dc.document_id,
      d.name as document_name,
      ts.name as source_name,
      (1 - (dc.embedding <=> query_embedding))::float as similarity,
      dc.metadata,
      CASE
        WHEN (1 - (dc.embedding <=> query_embedding)) > 0.95 THEN 1.15
        WHEN (1 - (dc.embedding <=> query_embedding)) > 0.85 THEN 1.08
        ELSE 1.0
      END as relevance_boost,
      LENGTH(dc.content)::float / 100 as completeness_score
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    JOIN teaching_sources ts ON d.source_id = ts.id
    WHERE
      (1 - (dc.embedding <=> query_embedding)) >= match_threshold
      AND d.status = 'indexed'
      AND d.deleted_at IS NULL
      AND ts.is_active = true
      AND (filter_language IS NULL OR d.metadata->>'language' = filter_language OR d.metadata->>'language' IS NULL)
  )
  SELECT
    rr.chunk_id,
    rr.content,
    rr.document_id,
    rr.document_name,
    rr.source_name,
    (rr.similarity * rr.relevance_boost)::float as final_similarity,
    rr.metadata
  FROM ranked_results rr
  ORDER BY
    (rr.similarity * rr.relevance_boost) DESC,
    rr.completeness_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
