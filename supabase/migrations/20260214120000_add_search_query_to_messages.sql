-- =====================================================
-- Migration: Add searchQuery column to messages table
-- Date: 2026-02-14
-- Issue: Store the search query used to find results
-- =====================================================

-- Add searchQuery column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS search_query TEXT;

-- Add index for search_query
CREATE INDEX IF NOT EXISTS idx_messages_search_query ON messages(search_query);

-- Verify migration
SELECT
  'searchQuery column added to messages table!' AS status,
  COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'messages';
