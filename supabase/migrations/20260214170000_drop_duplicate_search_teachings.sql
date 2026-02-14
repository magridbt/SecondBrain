-- Drop ALL versions of search_teachings using exact PostgreSQL internal types
-- Then recreate a single clean version

-- Drop using exact internal type signatures
DO $$
DECLARE
  func_oid oid;
BEGIN
  -- Find and drop all search_teachings functions
  FOR func_oid IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'search_teachings'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.search_teachings(' ||
      pg_get_function_identity_arguments(func_oid) || ') CASCADE';
    RAISE NOTICE 'Dropped search_teachings with oid %', func_oid;
  END LOOP;
END $$;

-- Recreate single clean version
CREATE FUNCTION search_teachings(
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
