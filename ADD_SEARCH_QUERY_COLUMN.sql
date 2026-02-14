-- =====================================================
-- Add search_query column to messages table
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Add the column
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS search_query TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_messages_search_query ON messages(search_query);

-- Verify
SELECT
  'Column added successfully!' AS status,
  COUNT(*) as total_messages
FROM messages;
