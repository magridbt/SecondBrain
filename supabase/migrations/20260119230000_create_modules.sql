-- =============================================
-- MÓDULOS DO SISTEMA
-- =============================================

-- Tabela de módulos disponíveis
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'box',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de acesso dos usuários aos módulos
CREATE TABLE IF NOT EXISTS user_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_modules_user ON user_modules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_modules_module ON user_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_modules_slug ON modules(slug);

-- Inserir módulo inicial: Sri AB Teachings
INSERT INTO modules (name, slug, description, icon, is_active)
VALUES (
  'Sri AB Teachings',
  'sri-ab-teachings',
  'Sistema de busca e gestão dos ensinamentos de Sri Amma Bhagavan',
  'book-open',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Dar acesso admin ao módulo para todos os admins existentes
INSERT INTO user_modules (user_id, module_id, role)
SELECT p.id, m.id, 'admin'
FROM profiles p
CROSS JOIN modules m
WHERE p.role = 'admin' AND m.slug = 'sri-ab-teachings'
ON CONFLICT (user_id, module_id) DO NOTHING;

-- Dar acesso viewer para usuários normais
INSERT INTO user_modules (user_id, module_id, role)
SELECT p.id, m.id, 'viewer'
FROM profiles p
CROSS JOIN modules m
WHERE p.role = 'user' AND m.slug = 'sri-ab-teachings'
ON CONFLICT (user_id, module_id) DO NOTHING;

-- Adicionar coluna module_access ao invites (para convites com acesso específico)
ALTER TABLE invites
ADD COLUMN IF NOT EXISTS module_access JSONB DEFAULT '[]'::jsonb;

-- RLS Policies
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_modules ENABLE ROW LEVEL SECURITY;

-- Todos podem ver módulos ativos
CREATE POLICY "Anyone can view active modules" ON modules
  FOR SELECT USING (is_active = true);

-- Admins podem gerenciar módulos
CREATE POLICY "Admins can manage modules" ON modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Usuários veem seus próprios acessos
CREATE POLICY "Users can view own module access" ON user_modules
  FOR SELECT USING (user_id = auth.uid());

-- Admins do sistema podem gerenciar acessos
CREATE POLICY "System admins can manage user modules" ON user_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Função helper para verificar acesso ao módulo
CREATE OR REPLACE FUNCTION has_module_access(
  p_user_id UUID,
  p_module_slug TEXT,
  p_min_role TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_role_level INT;
  v_min_level INT;
BEGIN
  -- Mapear roles para níveis
  v_min_level := CASE p_min_role
    WHEN 'viewer' THEN 1
    WHEN 'editor' THEN 2
    WHEN 'admin' THEN 3
    ELSE 0
  END;

  -- Buscar role do usuário no módulo
  SELECT um.role INTO v_role
  FROM user_modules um
  JOIN modules m ON um.module_id = m.id
  WHERE um.user_id = p_user_id AND m.slug = p_module_slug;

  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  v_role_level := CASE v_role
    WHEN 'viewer' THEN 1
    WHEN 'editor' THEN 2
    WHEN 'admin' THEN 3
    ELSE 0
  END;

  RETURN v_role_level >= v_min_level;
END;
$$;

-- Função para obter módulos do usuário
CREATE OR REPLACE FUNCTION get_user_modules(p_user_id UUID)
RETURNS TABLE (
  module_id UUID,
  module_name TEXT,
  module_slug TEXT,
  module_icon TEXT,
  user_role TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    m.id,
    m.name::TEXT,
    m.slug::TEXT,
    m.icon::TEXT,
    um.role::TEXT
  FROM user_modules um
  JOIN modules m ON um.module_id = m.id
  WHERE um.user_id = p_user_id AND m.is_active = true
  ORDER BY m.name;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION has_module_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_modules TO authenticated;

SELECT 'Modules tables created successfully!' AS result;
