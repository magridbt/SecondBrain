-- themes table already exists in DB with columns: slug, name_en, name_pt, etc.
-- Just ensure RLS and policies are in place

ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'themes' AND policyname = 'Authenticated users can view themes') THEN
    CREATE POLICY "Authenticated users can view themes" ON themes FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'themes' AND policyname = 'Admins can manage themes') THEN
    CREATE POLICY "Admins can manage themes" ON themes FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_themes_slug ON themes(slug);

-- document_themes table (referenced in supabase/migrations/20260223130000 and theme-classifier.ts)
CREATE TABLE IF NOT EXISTS document_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  confidence FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, theme_id)
);

ALTER TABLE document_themes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_themes' AND policyname = 'Authenticated users can view document_themes') THEN
    CREATE POLICY "Authenticated users can view document_themes" ON document_themes FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_themes' AND policyname = 'Admins can manage document_themes') THEN
    CREATE POLICY "Admins can manage document_themes" ON document_themes FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_document_themes_document_id ON document_themes(document_id);
CREATE INDEX IF NOT EXISTS idx_document_themes_theme_id ON document_themes(theme_id);

-- flagged_content table (referenced in src/lib/audit.ts)
CREATE TABLE IF NOT EXISTS flagged_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL,
  content_id UUID,
  reason TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE flagged_content ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'flagged_content' AND policyname = 'Admins can manage flagged_content') THEN
    CREATE POLICY "Admins can manage flagged_content" ON flagged_content FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'flagged_content' AND policyname = 'Users can view own flags') THEN
    CREATE POLICY "Users can view own flags" ON flagged_content FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'flagged_content' AND policyname = 'Users can create flags') THEN
    CREATE POLICY "Users can create flags" ON flagged_content FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flagged_content_status ON flagged_content(status);
CREATE INDEX IF NOT EXISTS idx_flagged_content_user_id ON flagged_content(user_id);
