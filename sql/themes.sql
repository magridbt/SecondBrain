-- ===========================================
-- THEMES SYSTEM FOR SRI AB TEACHINGS
-- ===========================================

-- Tabela de temas
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- 'meditation', 'relationships', etc.
  name_pt TEXT NOT NULL,               -- 'Meditação'
  name_en TEXT NOT NULL,               -- 'Meditation'
  name_es TEXT,                        -- 'Meditación'
  description_pt TEXT,                 -- Descrição para classificação
  description_en TEXT,
  icon TEXT DEFAULT '📚',              -- Emoji
  color TEXT DEFAULT '#6B7280',        -- Cor hex
  keywords TEXT[],                     -- Palavras-chave para ajudar classificação
  embedding vector(1024),              -- Embedding do tema (Voyage AI)
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relação documento <-> temas (N:N)
CREATE TABLE IF NOT EXISTS document_themes (
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
  confidence FLOAT DEFAULT 0.5,        -- Confiança da classificação (0-1)
  classified_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (document_id, theme_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_document_themes_document ON document_themes(document_id);
CREATE INDEX IF NOT EXISTS idx_document_themes_theme ON document_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_slug ON themes(slug);
CREATE INDEX IF NOT EXISTS idx_themes_active ON themes(is_active) WHERE is_active = true;

-- Inserir temas padrão
INSERT INTO themes (slug, name_pt, name_en, name_es, description_en, icon, color, keywords, display_order) VALUES
  ('meditation', 'Meditação', 'Meditation', 'Meditación',
   'Meditation practices, sadhana, spiritual practices, inner silence, contemplation, mindfulness',
   '🧘', '#8B5CF6', ARRAY['meditation', 'sadhana', 'practice', 'silence', 'contemplation', 'meditação', 'prática'], 1),

  ('relationships', 'Relacionamentos', 'Relationships', 'Relaciones',
   'Love relationships, marriage, partnership, romantic love, couples, dating, connection with others',
   '💕', '#EC4899', ARRAY['relationship', 'marriage', 'love', 'partner', 'couple', 'relacionamento', 'casamento', 'amor'], 2),

  ('family', 'Família', 'Family', 'Familia',
   'Family relationships, parents, children, siblings, family harmony, parenting, ancestors',
   '👨‍👩‍👧‍👦', '#F59E0B', ARRAY['family', 'parents', 'children', 'mother', 'father', 'família', 'pais', 'filhos'], 3),

  ('suffering', 'Sofrimento', 'Suffering', 'Sufrimiento',
   'Pain, suffering, problems, difficulties, challenges, trauma, healing from pain',
   '💔', '#EF4444', ARRAY['suffering', 'pain', 'problem', 'difficulty', 'trauma', 'sofrimento', 'dor', 'problema'], 4),

  ('mind', 'Mente', 'Mind', 'Mente',
   'Mind, thoughts, ego, thinking, mental patterns, consciousness, awareness',
   '🧠', '#3B82F6', ARRAY['mind', 'thought', 'ego', 'thinking', 'consciousness', 'mente', 'pensamento', 'ego'], 5),

  ('emotions', 'Emoções', 'Emotions', 'Emociones',
   'Emotions, feelings, anger, fear, sadness, joy, anxiety, depression, emotional healing',
   '🎭', '#10B981', ARRAY['emotion', 'feeling', 'anger', 'fear', 'sadness', 'emoção', 'raiva', 'medo', 'tristeza'], 6),

  ('enlightenment', 'Iluminação', 'Enlightenment', 'Iluminación',
   'Enlightenment, awakening, mukti, liberation, self-realization, spiritual awakening, nirvana',
   '✨', '#FBBF24', ARRAY['enlightenment', 'awakening', 'mukti', 'liberation', 'iluminação', 'despertar', 'libertação'], 7),

  ('grace', 'Graça', 'Grace', 'Gracia',
   'Divine grace, deeksha, blessings, Amma Bhagavan grace, spiritual transmission, divine intervention',
   '🙏', '#A855F7', ARRAY['grace', 'deeksha', 'blessing', 'divine', 'graça', 'bênção', 'divino'], 8),

  ('health', 'Saúde', 'Health', 'Salud',
   'Physical health, healing, wellness, body, disease, cure, well-being',
   '❤️‍🩹', '#14B8A6', ARRAY['health', 'healing', 'body', 'disease', 'wellness', 'saúde', 'cura', 'corpo'], 9),

  ('prosperity', 'Prosperidade', 'Prosperity', 'Prosperidad',
   'Work, career, money, abundance, prosperity, success, business, wealth',
   '💰', '#22C55E', ARRAY['work', 'money', 'prosperity', 'success', 'career', 'trabalho', 'dinheiro', 'prosperidade'], 10)

ON CONFLICT (slug) DO NOTHING;

-- Função para buscar documentos por tema
CREATE OR REPLACE FUNCTION search_by_theme(
  query_embedding vector(1024),
  theme_slugs TEXT[],
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5,
  filter_language TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  content TEXT,
  document_id UUID,
  document_name TEXT,
  source_name TEXT,
  similarity FLOAT,
  metadata JSONB,
  themes TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    dc.content,
    d.id AS document_id,
    d.name AS document_name,
    ts.name AS source_name,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata,
    ARRAY_AGG(DISTINCT t.slug) AS themes
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  JOIN teaching_sources ts ON d.source_id = ts.id
  LEFT JOIN document_themes dt ON d.id = dt.document_id
  LEFT JOIN themes t ON dt.theme_id = t.id
  WHERE d.status = 'indexed'
    AND d.deleted_at IS NULL
    AND dc.deleted_at IS NULL
    AND ts.is_active = true
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (theme_slugs IS NULL OR array_length(theme_slugs, 1) IS NULL OR t.slug = ANY(theme_slugs))
    AND (filter_language IS NULL OR d.metadata->>'language' = filter_language)
  GROUP BY dc.id, dc.content, d.id, d.name, ts.name, dc.embedding, dc.metadata
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS themes_updated_at ON themes;
CREATE TRIGGER themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW
  EXECUTE FUNCTION update_themes_updated_at();
