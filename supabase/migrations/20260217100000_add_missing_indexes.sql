-- Add missing indexes for common query patterns

-- daily_messages: queried by user_id + category + created_at
CREATE INDEX IF NOT EXISTS idx_daily_messages_user_category_created
ON daily_messages(user_id, category, created_at DESC);

-- custom_prompts: queried by user_id + category
CREATE INDEX IF NOT EXISTS idx_custom_prompts_user_category
ON custom_prompts(user_id, category);

-- token_usage: queried by user_id + created_at for usage limit checks
CREATE INDEX IF NOT EXISTS idx_token_usage_user_created
ON token_usage(user_id, created_at DESC);
