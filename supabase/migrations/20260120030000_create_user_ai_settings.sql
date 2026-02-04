-- =============================================
-- USER AI SETTINGS - Store API keys and model preferences
-- =============================================

-- 1. Create table for user AI settings
CREATE TABLE IF NOT EXISTS user_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- API Keys (encrypted at application level before storing)
  anthropic_api_key TEXT,
  openai_api_key TEXT,
  gemini_api_key TEXT,

  -- Model preferences
  default_provider VARCHAR(20) DEFAULT 'claude' CHECK (default_provider IN ('claude', 'chatgpt', 'gemini')),
  claude_model VARCHAR(50) DEFAULT 'claude-sonnet-4-20250514',
  openai_model VARCHAR(50) DEFAULT 'gpt-4o',
  gemini_model VARCHAR(50) DEFAULT 'gemini-1.5-pro',

  -- Settings
  temperature DECIMAL(2,1) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 1500 CHECK (max_tokens >= 100 AND max_tokens <= 8000),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One settings record per user
  UNIQUE(user_id)
);

-- 2. Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_ai_settings_user_id ON user_ai_settings(user_id);

-- 3. Enable RLS
ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - Users can only access their own settings
CREATE POLICY "Users can view own AI settings"
  ON user_ai_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI settings"
  ON user_ai_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI settings"
  ON user_ai_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI settings"
  ON user_ai_settings FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_ai_settings_updated_at
  BEFORE UPDATE ON user_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ai_settings_updated_at();

-- 6. Grant access
GRANT ALL ON user_ai_settings TO authenticated;

SELECT 'User AI Settings table created!' AS result;
