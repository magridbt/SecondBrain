-- =============================================
-- MÓDULO: PROMPTS PERSONALIZADOS
-- =============================================

-- Tabela de prompts customizados (como GPTs do ChatGPT)
CREATE TABLE IF NOT EXISTS custom_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identificação do prompt
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'sparkles',
  color VARCHAR(20) DEFAULT 'gold',

  -- O prompt em si
  system_prompt TEXT NOT NULL,

  -- Configurações
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false, -- Se outros usuários podem ver/usar

  -- Uso
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Slug único por usuário
  UNIQUE(user_id, slug)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_custom_prompts_user ON custom_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_prompts_slug ON custom_prompts(slug);
CREATE INDEX IF NOT EXISTS idx_custom_prompts_active ON custom_prompts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_custom_prompts_public ON custom_prompts(is_public) WHERE is_public = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_custom_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_custom_prompts_updated_at ON custom_prompts;
CREATE TRIGGER trigger_custom_prompts_updated_at
  BEFORE UPDATE ON custom_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_prompts_updated_at();

-- RLS Policies
ALTER TABLE custom_prompts ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios prompts
CREATE POLICY "Users can view own prompts" ON custom_prompts
  FOR SELECT USING (user_id = auth.uid());

-- Usuários podem ver prompts públicos de outros
CREATE POLICY "Users can view public prompts" ON custom_prompts
  FOR SELECT USING (is_public = true AND is_active = true);

-- Usuários podem criar seus próprios prompts
CREATE POLICY "Users can create own prompts" ON custom_prompts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Usuários podem atualizar seus próprios prompts
CREATE POLICY "Users can update own prompts" ON custom_prompts
  FOR UPDATE USING (user_id = auth.uid());

-- Usuários podem deletar seus próprios prompts
CREATE POLICY "Users can delete own prompts" ON custom_prompts
  FOR DELETE USING (user_id = auth.uid());

-- Admins podem ver todos os prompts
CREATE POLICY "Admins can view all prompts" ON custom_prompts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- PROMPTS PADRÃO DO SISTEMA
-- =============================================

-- Inserir alguns prompts padrão (serão associados ao primeiro admin)
-- Estes são prompts públicos que todos podem usar

DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Pegar o primeiro admin
  SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

  IF admin_id IS NOT NULL THEN
    -- Prompt: Mensagem Inspiradora
    INSERT INTO custom_prompts (user_id, name, slug, description, icon, color, system_prompt, is_public)
    VALUES (
      admin_id,
      'Mensagem Inspiradora',
      'mensagem-inspiradora',
      'Cria mensagens do dia inspiradoras e transformadoras',
      'sparkles',
      'gold',
      'Você é um assistente espiritual que cria mensagens do dia inspiradoras baseadas nos ensinamentos de Sri Amma Bhagavan.

INSTRUÇÕES:
1. Analise os ensinamentos fornecidos
2. Crie uma mensagem do dia inspiradora, profunda e transformadora
3. A mensagem deve ser concisa (2-4 parágrafos) mas impactante
4. Use um tom acolhedor, amoroso e que inspire reflexão
5. Mantenha fidelidade aos ensinamentos originais
6. A mensagem pode incluir uma prática ou reflexão para o dia

FORMATO:
- Título curto e inspirador (1 linha)
- Mensagem principal (2-4 parágrafos)
- Opcional: Uma prática ou reflexão para o dia',
      true
    )
    ON CONFLICT (user_id, slug) DO NOTHING;

    -- Prompt: Reflexão Profunda
    INSERT INTO custom_prompts (user_id, name, slug, description, icon, color, system_prompt, is_public)
    VALUES (
      admin_id,
      'Reflexão Profunda',
      'reflexao-profunda',
      'Cria reflexões profundas para contemplação',
      'brain',
      'purple',
      'Você é um guia espiritual que cria reflexões profundas baseadas nos ensinamentos de Sri Amma Bhagavan.

INSTRUÇÕES:
1. Analise os ensinamentos com profundidade
2. Extraia a essência filosófica e espiritual
3. Crie uma reflexão que convide à contemplação
4. Use perguntas que estimulem o autoconhecimento
5. Mantenha um tom contemplativo e meditativo

FORMATO:
- Tema central
- Reflexão principal (3-5 parágrafos)
- 2-3 perguntas para contemplação pessoal',
      true
    )
    ON CONFLICT (user_id, slug) DO NOTHING;

    -- Prompt: Prática do Dia
    INSERT INTO custom_prompts (user_id, name, slug, description, icon, color, system_prompt, is_public)
    VALUES (
      admin_id,
      'Prática do Dia',
      'pratica-do-dia',
      'Sugere práticas espirituais baseadas nos ensinamentos',
      'heart',
      'rose',
      'Você é um instrutor espiritual que sugere práticas diárias baseadas nos ensinamentos de Sri Amma Bhagavan.

INSTRUÇÕES:
1. Analise os ensinamentos fornecidos
2. Identifique um aspecto prático que pode ser aplicado
3. Crie uma prática simples e acessível para o dia
4. Inclua instruções claras e objetivas
5. A prática deve ser factível em 5-15 minutos

FORMATO:
- Nome da prática
- Benefício esperado (1-2 linhas)
- Instruções passo a passo
- Dica para integrar na rotina',
      true
    )
    ON CONFLICT (user_id, slug) DO NOTHING;

    -- Prompt: Mensagem para Redes Sociais
    INSERT INTO custom_prompts (user_id, name, slug, description, icon, color, system_prompt, is_public)
    VALUES (
      admin_id,
      'Post para Redes Sociais',
      'post-redes-sociais',
      'Cria posts curtos para Instagram/Facebook',
      'share-2',
      'blue',
      'Você é um criador de conteúdo espiritual que cria posts para redes sociais baseados nos ensinamentos de Sri Amma Bhagavan.

INSTRUÇÕES:
1. Analise os ensinamentos fornecidos
2. Extraia uma mensagem impactante e compartilhável
3. Use linguagem acessível e contemporânea
4. Inclua emojis apropriados
5. O texto deve ter no máximo 280 caracteres para o principal

FORMATO:
- Frase principal (impactante, com emoji)
- Texto de apoio (1-2 linhas)
- 3-5 hashtags relevantes',
      true
    )
    ON CONFLICT (user_id, slug) DO NOTHING;
  END IF;
END $$;

SELECT 'Custom Prompts table created successfully!' AS result;
