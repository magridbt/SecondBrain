-- embedding_cache RLS
ALTER TABLE embedding_cache ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'embedding_cache' AND policyname = 'Authenticated users can read embedding_cache') THEN
    CREATE POLICY "Authenticated users can read embedding_cache" ON embedding_cache FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'embedding_cache' AND policyname = 'Service role can manage embedding_cache') THEN
    CREATE POLICY "Service role can manage embedding_cache" ON embedding_cache FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- usage_limits RLS
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage_limits' AND policyname = 'Authenticated users can read usage_limits') THEN
    CREATE POLICY "Authenticated users can read usage_limits" ON usage_limits FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage_limits' AND policyname = 'Service role can manage usage_limits') THEN
    CREATE POLICY "Service role can manage usage_limits" ON usage_limits FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
