-- =============================================
-- RENOMEAR MÓDULO: Mensagem do Dia -> Daily Teaching
-- ADICIONAR SUPORTE MULTI-AI
-- =============================================

-- 1. Atualizar o nome do módulo
UPDATE modules
SET
  name = 'Daily Teaching',
  slug = 'daily-teaching',
  description = 'Generate inspirational teachings using AI (Claude, ChatGPT, Gemini)'
WHERE slug = 'mensagem-do-dia';

-- 2. Adicionar coluna ai_provider na tabela daily_messages
ALTER TABLE daily_messages
ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(20) DEFAULT 'claude'
  CHECK (ai_provider IN ('claude', 'chatgpt', 'gemini'));

-- 3. Adicionar coluna ai_model para rastrear qual modelo específico foi usado
ALTER TABLE daily_messages
ADD COLUMN IF NOT EXISTS ai_model VARCHAR(50);

-- 4. Adicionar coluna prompt_id para rastrear qual prompt foi usado
ALTER TABLE daily_messages
ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES custom_prompts(id) ON DELETE SET NULL;

-- 5. Índice para consultas por provider
CREATE INDEX IF NOT EXISTS idx_daily_messages_provider ON daily_messages(ai_provider);

-- 6. Atualizar registros existentes
UPDATE daily_messages
SET ai_provider = 'claude', ai_model = 'claude-sonnet-4-20250514'
WHERE ai_provider IS NULL;

SELECT 'Module renamed to Daily Teaching and multi-AI support added!' AS result;
