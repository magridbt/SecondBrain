-- =============================================
-- MÓDULO: MENSAGEM DO DIA
-- =============================================

-- Tabela principal de mensagens do dia
CREATE TABLE IF NOT EXISTS daily_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Tema pesquisado pelo usuário
  topic VARCHAR(255) NOT NULL,

  -- Ensinamentos selecionados (IDs dos chunks)
  selected_chunks JSONB DEFAULT '[]'::jsonb,

  -- Mensagem gerada
  generated_message TEXT,

  -- Metadados
  language VARCHAR(5) DEFAULT 'pt',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Para compartilhamento
  share_token VARCHAR(64) UNIQUE,
  is_public BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_daily_messages_user ON daily_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_messages_status ON daily_messages(status);
CREATE INDEX IF NOT EXISTS idx_daily_messages_created ON daily_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_messages_share ON daily_messages(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_messages_public ON daily_messages(is_public) WHERE is_public = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_daily_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_daily_messages_updated_at ON daily_messages;
CREATE TRIGGER trigger_daily_messages_updated_at
  BEFORE UPDATE ON daily_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_messages_updated_at();

-- RLS Policies
ALTER TABLE daily_messages ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias mensagens
CREATE POLICY "Users can view own daily messages" ON daily_messages
  FOR SELECT USING (user_id = auth.uid());

-- Usuários podem criar suas próprias mensagens
CREATE POLICY "Users can create own daily messages" ON daily_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Usuários podem atualizar suas próprias mensagens
CREATE POLICY "Users can update own daily messages" ON daily_messages
  FOR UPDATE USING (user_id = auth.uid());

-- Usuários podem deletar suas próprias mensagens
CREATE POLICY "Users can delete own daily messages" ON daily_messages
  FOR DELETE USING (user_id = auth.uid());

-- Qualquer um pode ver mensagens públicas (para compartilhamento)
CREATE POLICY "Anyone can view public daily messages" ON daily_messages
  FOR SELECT USING (is_public = true AND status = 'published');

-- Admins podem ver todas as mensagens
CREATE POLICY "Admins can view all daily messages" ON daily_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- INSERIR MÓDULO MENSAGEM DO DIA
-- =============================================

INSERT INTO modules (name, slug, description, icon, is_active)
VALUES (
  'Mensagem do Dia',
  'mensagem-do-dia',
  'Gere mensagens inspiradoras baseadas nos ensinamentos de Sri Amma Bhagavan',
  'calendar',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Dar acesso admin ao módulo para todos os admins existentes
INSERT INTO user_modules (user_id, module_id, role)
SELECT p.id, m.id, 'admin'
FROM profiles p
CROSS JOIN modules m
WHERE p.role = 'admin' AND m.slug = 'mensagem-do-dia'
ON CONFLICT (user_id, module_id) DO NOTHING;

-- Dar acesso editor para usuários normais (podem criar mensagens)
INSERT INTO user_modules (user_id, module_id, role)
SELECT p.id, m.id, 'editor'
FROM profiles p
CROSS JOIN modules m
WHERE p.role = 'user' AND m.slug = 'mensagem-do-dia'
ON CONFLICT (user_id, module_id) DO NOTHING;

SELECT 'Daily Messages module created successfully!' AS result;
