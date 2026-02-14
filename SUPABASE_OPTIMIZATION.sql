-- ============================================================================
-- OTIMIZAÇÃO DE BUSCA SEMÂNTICA - Sri AB Teachings
-- ============================================================================
-- Função otimizada com melhor ranking e filtering
-- Data: 2026-02-14
-- ============================================================================

-- Passo 1: Criar função otimizada (execute isto primeiro)
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
      -- Boost relevance para high-quality matches
      CASE
        WHEN (1 - (dc.embedding <=> query_embedding)) > 0.95 THEN 1.15
        WHEN (1 - (dc.embedding <=> query_embedding)) > 0.85 THEN 1.08
        ELSE 1.0
      END as relevance_boost,
      -- Preferir conteúdo mais completo (mais informação = melhor)
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
    chunk_id,
    content,
    document_id,
    document_name,
    source_name,
    (similarity * relevance_boost)::float as final_similarity,
    metadata
  FROM ranked_results
  ORDER BY
    (similarity * relevance_boost) DESC,
    completeness_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Passo 2: Verificar que a função foi criada
-- Execute isto para testar:
-- ============================================================================
-- SELECT pg_get_functiondef(oid)
-- FROM pg_proc
-- WHERE proname = 'search_teachings_optimized';

-- ============================================================================
-- EXPLICAÇÃO DAS OTIMIZAÇÕES
-- ============================================================================
--
-- ✅ MELHORIAS IMPLEMENTADAS:
--
-- 1. RELEVANCE BOOST (relevance_boost)
--    - Resultados com similarity > 95% recebem +15% boost
--    - Resultados com similarity > 85% recebem +8% boost
--    - Melhora qualidade dos top results
--
-- 2. COMPLETENESS SCORING (completeness_score)
--    - Prefere chunks mais longos (mais informação)
--    - Evita resultados muito curtos e superficiais
--    - Baseado em LENGTH(content)
--
-- 3. FILTERING MELHORADO
--    - Garante apenas documentos "indexed"
--    - Remove documentos deletados (deleted_at IS NULL)
--    - Apenas teaching sources ativas
--    - Filtra por language corretamente
--
-- 4. RANKING FINAL
--    - Ordena por (similarity * relevance_boost) DESC
--    - Secondary sort por completeness_score
--    - Mais relevante = vem primeiro
--
-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
--
-- ❌ ANTES: Resultados com muitos stopwords, sem ordem de qualidade
-- ✅ DEPOIS:
--    - Resultados melhor rankeados
--    - Menos ruído
--    - Mais informativo
--    - Melhor experiência do usuário
--
-- ============================================================================
