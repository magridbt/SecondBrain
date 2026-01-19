-- Migration: Fix vector dimensions from 1536 (OpenAI) to 1024 (Voyage AI)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zvuzkuyqeapbmfmcngae/sql

-- Step 1: Drop existing indexes on embedding columns
DROP INDEX IF EXISTS idx_chunks_embedding;
DROP INDEX IF EXISTS idx_cache_embedding;

-- Step 2: Clear existing embeddings (they're stored incorrectly anyway)
-- This will force re-processing of documents
UPDATE document_chunks SET embedding = NULL;
UPDATE response_cache SET question_embedding = NULL;

-- Step 3: Alter column types to correct dimension (1024 for Voyage AI voyage-2)
ALTER TABLE document_chunks
  ALTER COLUMN embedding TYPE VECTOR(1024);

ALTER TABLE response_cache
  ALTER COLUMN question_embedding TYPE VECTOR(1024);

-- Step 4: Recreate HNSW indexes for fast similarity search
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_cache_embedding ON response_cache
  USING hnsw (question_embedding vector_cosine_ops);

-- Step 5: Update the search_teachings function to use correct dimension
CREATE OR REPLACE FUNCTION search_teachings(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
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
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 6: Update search_response_cache function
CREATE OR REPLACE FUNCTION search_response_cache(
  query_embedding VECTOR(1024),
  similarity_threshold FLOAT DEFAULT 0.95
)
RETURNS TABLE (
  response TEXT,
  sources JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.response,
    rc.sources,
    1 - (rc.question_embedding <=> query_embedding) AS similarity
  FROM response_cache rc
  WHERE rc.expires_at > NOW()
    AND rc.question_embedding IS NOT NULL
    AND 1 - (rc.question_embedding <=> query_embedding) > similarity_threshold
  ORDER BY rc.question_embedding <=> query_embedding
  LIMIT 1;
END;
$$;

-- Step 7: Mark all documents as needing reprocessing
UPDATE documents SET status = 'pending' WHERE status = 'indexed';

-- Done! After running this:
-- 1. Go to Documents page in admin
-- 2. Documents will be automatically reprocessed with correct embeddings
-- Or manually trigger reprocessing by re-uploading documents
