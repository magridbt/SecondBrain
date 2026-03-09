-- =============================================
-- MIGRATION 003: Miracles Module
-- =============================================

-- 1. Miracles table - stores miracle testimonials
CREATE TABLE IF NOT EXISTS miracles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  source_network TEXT NOT NULL CHECK (source_network IN ('youtube', 'instagram', 'x-twitter', 'facebook', 'linkedin', 'tiktok', 'threads', 'pinterest', 'whatsapp', 'telegram', 'email', 'outro')),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Miracle prompts - specific prompts per target social network
CREATE TABLE IF NOT EXISTS miracle_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_network TEXT NOT NULL CHECK (target_network IN ('youtube', 'instagram', 'x-twitter', 'facebook', 'linkedin', 'tiktok', 'threads', 'pinterest')),
  system_prompt TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Miracle copies - generated content from miracles
CREATE TABLE IF NOT EXISTS miracle_copies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  miracle_id UUID NOT NULL REFERENCES miracles(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES miracle_prompts(id) ON DELETE SET NULL,
  target_network TEXT NOT NULL CHECK (target_network IN ('youtube', 'instagram', 'x-twitter', 'facebook', 'linkedin', 'tiktok', 'threads', 'pinterest')),
  generated_copy TEXT NOT NULL,
  ai_provider TEXT NOT NULL DEFAULT 'claude',
  ai_model TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_miracles_user_id ON miracles(user_id);
CREATE INDEX IF NOT EXISTS idx_miracles_source_network ON miracles(source_network);
CREATE INDEX IF NOT EXISTS idx_miracles_created_at ON miracles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_miracle_prompts_user_id ON miracle_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_miracle_prompts_target_network ON miracle_prompts(target_network);
CREATE INDEX IF NOT EXISTS idx_miracle_copies_user_id ON miracle_copies(user_id);
CREATE INDEX IF NOT EXISTS idx_miracle_copies_miracle_id ON miracle_copies(miracle_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_miracles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER miracles_updated_at
  BEFORE UPDATE ON miracles
  FOR EACH ROW EXECUTE FUNCTION update_miracles_updated_at();

CREATE TRIGGER miracle_prompts_updated_at
  BEFORE UPDATE ON miracle_prompts
  FOR EACH ROW EXECUTE FUNCTION update_miracles_updated_at();

-- RLS Policies
ALTER TABLE miracles ENABLE ROW LEVEL SECURITY;
ALTER TABLE miracle_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE miracle_copies ENABLE ROW LEVEL SECURITY;

-- Miracles: users only see their own
CREATE POLICY "Users can view own miracles" ON miracles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own miracles" ON miracles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own miracles" ON miracles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own miracles" ON miracles FOR DELETE USING (auth.uid() = user_id);

-- Miracle prompts: users see own + defaults
CREATE POLICY "Users can view own prompts" ON miracle_prompts FOR SELECT USING (auth.uid() = user_id OR is_default = true);
CREATE POLICY "Users can insert own prompts" ON miracle_prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prompts" ON miracle_prompts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prompts" ON miracle_prompts FOR DELETE USING (auth.uid() = user_id);

-- Miracle copies: users only see their own
CREATE POLICY "Users can view own copies" ON miracle_copies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own copies" ON miracle_copies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own copies" ON miracle_copies FOR DELETE USING (auth.uid() = user_id);
