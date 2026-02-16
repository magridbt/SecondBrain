-- Migration 002: Fix audit_logs + Add token usage tracking
-- Date: 2026-02-16

-- ============================================
-- 1. FIX AUDIT_LOGS TABLE (add missing columns)
-- ============================================
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

-- Add missing indexes for common filters
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_source_status ON documents(source_id, status);
CREATE INDEX IF NOT EXISTS idx_chunks_document_index ON document_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_role ON messages(conversation_id, role);

-- ============================================
-- 2. TOKEN USAGE TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('claude', 'chatgpt', 'gemini', 'voyage')),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
  endpoint VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_usage_user ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created ON token_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_date ON token_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_provider ON token_usage(provider);

-- ============================================
-- 3. DAILY/MONTHLY USAGE LIMITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL UNIQUE,
  daily_token_limit INTEGER NOT NULL DEFAULT 100000,
  monthly_token_limit INTEGER NOT NULL DEFAULT 2000000,
  daily_request_limit INTEGER NOT NULL DEFAULT 100,
  monthly_request_limit INTEGER NOT NULL DEFAULT 2000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO usage_limits (role, daily_token_limit, monthly_token_limit, daily_request_limit, monthly_request_limit) VALUES
  ('member', 100000, 2000000, 100, 2000),
  ('admin', 500000, 10000000, 500, 10000)
ON CONFLICT (role) DO NOTHING;

-- ============================================
-- 4. FUNCTION: Get user token usage for period
-- ============================================
CREATE OR REPLACE FUNCTION get_user_token_usage(
  p_user_id UUID,
  p_period TEXT DEFAULT 'day'
)
RETURNS TABLE (
  total_tokens BIGINT,
  total_cost DECIMAL,
  request_count BIGINT
) AS $$
BEGIN
  IF p_period = 'day' THEN
    RETURN QUERY
    SELECT
      COALESCE(SUM(tu.input_tokens + tu.output_tokens), 0)::BIGINT,
      COALESCE(SUM(tu.cost_usd), 0)::DECIMAL,
      COUNT(*)::BIGINT
    FROM token_usage tu
    WHERE tu.user_id = p_user_id
      AND tu.created_at >= CURRENT_DATE;
  ELSIF p_period = 'month' THEN
    RETURN QUERY
    SELECT
      COALESCE(SUM(tu.input_tokens + tu.output_tokens), 0)::BIGINT,
      COALESCE(SUM(tu.cost_usd), 0)::DECIMAL,
      COUNT(*)::BIGINT
    FROM token_usage tu
    WHERE tu.user_id = p_user_id
      AND tu.created_at >= DATE_TRUNC('month', CURRENT_DATE);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. EMBEDDING CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  embedding VECTOR(1024) NOT NULL,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_hash ON embedding_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_expires ON embedding_cache(expires_at);

-- ============================================
-- 6. RLS POLICIES (missing ones)
-- ============================================

-- Conversations: users can only see their own
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conversations_user_policy ON conversations;
CREATE POLICY conversations_user_policy ON conversations
  FOR ALL USING (auth.uid() = user_id);

-- Messages: users can only see messages in their conversations
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS messages_user_policy ON messages;
CREATE POLICY messages_user_policy ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Feedback: users can only manage their own
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feedback_user_policy ON feedback;
CREATE POLICY feedback_user_policy ON feedback
  FOR ALL USING (auth.uid() = user_id);

-- Token usage: users can only see their own
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS token_usage_user_policy ON token_usage;
CREATE POLICY token_usage_user_policy ON token_usage
  FOR ALL USING (auth.uid() = user_id);

-- Daily messages: users can only see their own
ALTER TABLE daily_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_messages_user_policy ON daily_messages;
CREATE POLICY daily_messages_user_policy ON daily_messages
  FOR ALL USING (auth.uid() = user_id);
