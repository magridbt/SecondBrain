-- =====================================================
-- FILTRO DE IDIOMA PARA BUSCA - Sri AB Teachings
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- Atualizar a função de busca para filtrar por idioma
DROP FUNCTION IF EXISTS search_teachings(vector(1024), float, int);
DROP FUNCTION IF EXISTS search_teachings(vector(1024), float, int, text);

CREATE OR REPLACE FUNCTION search_teachings(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5,
  filter_language text DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  source_name text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id as chunk_id,
    dc.document_id,
    d.name as document_name,
    ts.name as source_name,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  JOIN teaching_sources ts ON ts.id = d.source_id
  WHERE
    d.status = 'indexed'
    AND d.deleted_at IS NULL
    AND dc.deleted_at IS NULL
    AND ts.is_active = true
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    -- Filtrar por idioma se especificado
    AND (
      filter_language IS NULL
      OR d.metadata->>'language' = filter_language
    )
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

SELECT 'Função search_teachings atualizada com filtro de idioma!' as status;
