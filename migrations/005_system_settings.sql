-- ============================================================
-- Migration 005: System Settings
-- Tabela para configurações globais do sistema (branding, etc.)
-- Substitui o localStorage como fonte da verdade
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: qualquer autenticado pode ler, apenas service_role pode escrever
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Inserir valores padrão
INSERT INTO public.system_settings (key, value) VALUES
  ('system_name',     'Sri AB Teachings'),
  ('system_subtitle', 'Sri Amma Bhagavan'),
  ('avatar_url',      '')
ON CONFLICT (key) DO NOTHING;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();
