CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  avatar_url VARCHAR(500),
  preferences JSONB DEFAULT '{"language": "pt", "theme": "light"}',
  token_usage_today INTEGER DEFAULT 0,
  token_usage_month INTEGER DEFAULT 0,
  last_token_reset DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  invited_by UUID REFERENCES profiles(id),
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_pending_invite UNIQUE (email, accepted_at)
);

CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_deleted ON profiles(deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE teaching_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  document_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_teaching_sources_updated_at
  BEFORE UPDATE ON teaching_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO teaching_sources (name, description) VALUES
  ('Programa 81000 Deeksha Yajna', 'Ensinamentos do programa 81000'),
  ('Aulas Aprofundamentos', 'Aulas de aprofundamento espiritual'),
  ('Videos Kalki Dharma', 'Videos do Kalki Dharma'),
  ('Tejasaji', 'Ensinamentos de Tejasaji'),
  ('Outros', 'Outras fontes diversas');

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('pdf', 'transcript', 'text')),
  source_id UUID NOT NULL REFERENCES teaching_sources(id),
  original_filename VARCHAR(255),
  storage_path VARCHAR(500),
  file_size_bytes INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'processed', 'indexed', 'error')),
  uploaded_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_source_document_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE teaching_sources
    SET document_count = document_count + 1
    WHERE id = NEW.source_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE teaching_sources
    SET document_count = document_count - 1
    WHERE id = OLD.source_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_source_count
  AFTER INSERT OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_source_document_count();

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_hash VARCHAR(64),
  embedding VECTOR(1024),  -- Voyage AI voyage-2 uses 1024 dimensions
  chunk_index INTEGER NOT NULL,
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_source ON documents(source_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_deleted ON documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_name_search ON documents USING gin(to_tsvector('portuguese', name));
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_hash ON document_chunks(content_hash);

CREATE INDEX idx_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  module VARCHAR(50) NOT NULL DEFAULT 'secondbrain',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  model_used VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET
    message_count = message_count + 1,
    title = COALESCE(title, LEFT(NEW.content, 100)),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.role = 'user')
  EXECUTE FUNCTION update_conversation_on_message();

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_deleted ON conversations(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  rating VARCHAR(20) NOT NULL CHECK (rating IN ('like', 'dislike')),
  comment TEXT,
  tags VARCHAR(50)[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_message_feedback UNIQUE (user_id, message_id)
);

CREATE INDEX idx_feedback_message ON feedback(message_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action VARCHAR(100),
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE response_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_hash VARCHAR(64) NOT NULL,
  question_embedding VECTOR(1024),  -- Voyage AI voyage-2 uses 1024 dimensions
  response TEXT NOT NULL,
  sources JSONB,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_cache_hash ON response_cache(question_hash);
CREATE INDEX idx_cache_embedding ON response_cache
  USING hnsw (question_embedding vector_cosine_ops);
CREATE INDEX idx_cache_expires ON response_cache(expires_at);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_cache ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

CREATE POLICY "Authenticated users can view active sources"
  ON teaching_sources FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage sources"
  ON teaching_sources FOR ALL
  USING (is_admin());

CREATE POLICY "Authenticated users can view indexed documents"
  ON documents FOR SELECT
  TO authenticated
  USING (status = 'indexed' AND deleted_at IS NULL);

CREATE POLICY "Admins can manage documents"
  ON documents FOR ALL
  USING (is_admin());

CREATE POLICY "Authenticated users can search chunks"
  ON document_chunks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_chunks.document_id
      AND documents.status = 'indexed'
      AND documents.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can manage own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
      AND conversations.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
      AND conversations.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can manage own feedback"
  ON feedback FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON feedback FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage invites"
  ON invites FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "System can manage cache"
  ON response_cache FOR ALL
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION search_teachings(
  query_embedding VECTOR(1024),  -- Voyage AI voyage-2 uses 1024 dimensions
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5,
  filter_language TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_name VARCHAR,
  source_name VARCHAR,
  source_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    d.id AS document_id,
    d.name AS document_name,
    ts.name AS source_name,
    ts.id AS source_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  JOIN teaching_sources ts ON d.source_id = ts.id
  WHERE d.status = 'indexed'
    AND d.deleted_at IS NULL
    AND ts.is_active = true
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (filter_language IS NULL OR d.metadata->>'language' = filter_language OR d.metadata->>'language' IS NULL)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_response_cache(
  query_embedding VECTOR(1024),  -- Voyage AI voyage-2 uses 1024 dimensions
  similarity_threshold FLOAT DEFAULT 0.95
)
RETURNS TABLE (
  response TEXT,
  sources JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.response,
    rc.sources,
    1 - (rc.question_embedding <=> query_embedding) AS similarity
  FROM response_cache rc
  WHERE rc.expires_at > NOW()
    AND 1 - (rc.question_embedding <=> query_embedding) > similarity_threshold
  ORDER BY rc.question_embedding <=> query_embedding
  LIMIT 1;
END;
$$;
