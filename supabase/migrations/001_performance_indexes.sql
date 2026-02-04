-- =====================================================
-- Performance Optimization: Database Indexes
-- Migration: 2026-02-01
-- =====================================================
-- Esta migração cria índices para otimizar queries frequentes
-- Reduz tempo de resposta de O(n) para O(log n)
-- =====================================================

-- 1. Vector Search Index (HNSW - mais rápido que IVFFlat)
-- Usado em: Busca semântica de documentos
-- Impacto: Reduz busca vetorial em ~10x
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 2. Document Queries - Optimize uploaded_by queries
CREATE INDEX IF NOT EXISTS idx_documents_user_created
ON documents(uploaded_by, created_at DESC)
WHERE deleted_at IS NULL;

-- 3. Document Status Queries
CREATE INDEX IF NOT EXISTS idx_documents_source_status
ON documents(source_id, status)
WHERE deleted_at IS NULL;

-- 4. Conversation Queries (Most Common Access Pattern)
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
ON conversations(user_id, updated_at DESC)
WHERE deleted_at IS NULL;

-- 5. Message Queries (Most Common Join)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at DESC)
WHERE deleted_at IS NULL;

-- 6. Chunk Document Relationship
CREATE INDEX IF NOT EXISTS idx_chunks_document_index
ON document_chunks(document_id, chunk_index)
WHERE deleted_at IS NULL;

-- 7. Feedback Queries
CREATE INDEX IF NOT EXISTS idx_feedback_rating_created
ON feedback(rating, created_at DESC);

-- 8. Profile Queries - Role-based access
CREATE INDEX IF NOT EXISTS idx_profiles_role_active
ON profiles(role, deleted_at)
WHERE deleted_at IS NULL;

-- 9. Invite Queries - Pending invites
CREATE INDEX IF NOT EXISTS idx_invites_email_active
ON invites(email)
WHERE accepted_at IS NULL AND expires_at > NOW();

-- 10. Teaching Sources - Active sources
CREATE INDEX IF NOT EXISTS idx_teaching_sources_active
ON teaching_sources(is_active)
WHERE is_active = true;

-- 11. Response Cache - For semantic search
CREATE INDEX IF NOT EXISTS idx_cache_question_embedding
ON response_cache
USING hnsw (question_embedding vector_cosine_ops)
WHERE expires_at > NOW();

-- 12. Conversation Title Search - Full text search
CREATE INDEX IF NOT EXISTS idx_conversations_title_search
ON conversations
USING gin(to_tsvector('portuguese', title))
WHERE deleted_at IS NULL;

-- =====================================================
-- Analyze all tables for query planner optimization
-- =====================================================
ANALYZE document_chunks;
ANALYZE documents;
ANALYZE conversations;
ANALYZE messages;
ANALYZE profiles;
ANALYZE invites;
ANALYZE teaching_sources;
ANALYZE response_cache;
ANALYZE feedback;

-- =====================================================
-- Log da Migração
-- =====================================================
-- Índices criados: 12
-- Tempo esperado de ganho: 30-40% em queries frequentes
-- =====================================================
