-- Add category column to daily_messages for social media module
ALTER TABLE daily_messages
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'daily-teaching';

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_daily_messages_category
ON daily_messages(category);

-- Composite index for user + category queries
CREATE INDEX IF NOT EXISTS idx_daily_messages_user_category
ON daily_messages(user_id, category, created_at DESC);
