-- =====================================================
-- Migration: Fix RLS Policies
-- Date: 2026-01-21
-- Issues Fixed:
--   1. Enable RLS on themes and document_themes tables
--   2. Fix overly permissive response_cache policy
--   3. Add recommended indexes
-- =====================================================

-- =====================================================
-- FIX 1: Enable RLS on Theme Tables
-- =====================================================
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_themes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view active themes" ON themes;
DROP POLICY IF EXISTS "Admins can manage themes" ON themes;
DROP POLICY IF EXISTS "Authenticated can view document themes" ON document_themes;
DROP POLICY IF EXISTS "Admins can manage document themes" ON document_themes;

-- Public read for themes (they're not sensitive)
CREATE POLICY "Anyone can view active themes" ON themes
  FOR SELECT USING (is_active = true);

-- Only admins can modify themes
CREATE POLICY "Admins can manage themes" ON themes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authenticated users can view document themes
CREATE POLICY "Authenticated can view document themes" ON document_themes
  FOR SELECT TO authenticated USING (true);

-- Only admins can modify document themes
CREATE POLICY "Admins can manage document themes" ON document_themes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- FIX 2: Restrict response_cache Policy
-- =====================================================
DROP POLICY IF EXISTS "System can manage cache" ON response_cache;
DROP POLICY IF EXISTS "Authenticated can read cache" ON response_cache;

-- Only allow reading cache, writes should be via service role
CREATE POLICY "Authenticated can read cache" ON response_cache
  FOR SELECT TO authenticated USING (true);

-- Service role has full access (used by API routes)
-- Note: Service role bypasses RLS by default

-- =====================================================
-- FIX 3: Add Recommended Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_daily_messages_language ON daily_messages(language);
CREATE INDEX IF NOT EXISTS idx_themes_display_order ON themes(display_order);
CREATE INDEX IF NOT EXISTS idx_document_themes_confidence ON document_themes(confidence);

-- =====================================================
-- Verification Query
-- =====================================================
SELECT
  'RLS Policies Fixed!' AS status,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'themes') AS themes_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_themes') AS document_themes_policies;
