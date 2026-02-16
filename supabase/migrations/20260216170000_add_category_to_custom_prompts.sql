-- Add category column to custom_prompts for independent prompts per module
ALTER TABLE custom_prompts
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'daily-teaching';

CREATE INDEX IF NOT EXISTS idx_custom_prompts_category
ON custom_prompts(category);

CREATE INDEX IF NOT EXISTS idx_custom_prompts_user_category
ON custom_prompts(user_id, category, is_active);
