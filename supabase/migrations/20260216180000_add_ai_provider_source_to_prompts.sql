-- Add ai_provider preference and source_url to custom_prompts
ALTER TABLE custom_prompts
ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(20) DEFAULT 'claude',
ADD COLUMN IF NOT EXISTS source_url TEXT;
