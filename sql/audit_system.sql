-- =====================================================
-- SISTEMA DE AUDITORIA E CONTROLE - SecondBrain
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Adicionar soft delete nas tabelas existentes
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL, -- 'chat_message', 'delete_conversation', 'upload_document', 'login', 'logout', etc.
  entity_type TEXT, -- 'conversation', 'message', 'document', etc.
  entity_id UUID,
  details JSONB DEFAULT '{}', -- Dados adicionais (conteúdo da mensagem, metadata, etc.)
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela para conteúdo flagado/problemático
CREATE TABLE IF NOT EXISTS flagged_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  content_type TEXT NOT NULL, -- 'message', 'document', etc.
  content_id UUID,
  content_text TEXT, -- Cópia do conteúdo flagado
  reason TEXT, -- 'inappropriate', 'spam', 'offensive', 'auto_detected', etc.
  severity TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed', 'action_taken'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar tabela de sessões de usuário (para tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  messages_sent INTEGER DEFAULT 0,
  documents_uploaded INTEGER DEFAULT 0
);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_flagged_content_user_id ON flagged_content(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_content_status ON flagged_content(status);
CREATE INDEX IF NOT EXISTS idx_flagged_content_severity ON flagged_content(severity);

CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at ON conversations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- 6. RLS (Row Level Security) para as novas tabelas
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas admins podem ver logs e conteúdo flagado
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view flagged content" ON flagged_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role can insert flagged content" ON flagged_content
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON user_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. View para relatório de atividade dos usuários
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  u.id as user_id,
  u.email,
  p.role,
  COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL) as active_conversations,
  COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NOT NULL) as deleted_conversations,
  COUNT(m.id) FILTER (WHERE m.role = 'user') as total_messages_sent,
  COUNT(fc.id) as flagged_content_count,
  MAX(m.created_at) as last_message_at,
  MIN(c.created_at) as first_conversation_at
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN conversations c ON c.user_id = u.id
LEFT JOIN messages m ON m.conversation_id = c.id
LEFT JOIN flagged_content fc ON fc.user_id = u.id
GROUP BY u.id, u.email, p.role;

-- 8. Função para registrar ação no audit log (para usar no código)
CREATE OR REPLACE FUNCTION log_audit_action(
  p_user_id UUID,
  p_user_email TEXT,
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details)
  VALUES (p_user_id, p_user_email, p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Atualizar a query de busca de conversas para ignorar deletadas
-- (Isso já é feito no código, mas documentamos aqui)
COMMENT ON COLUMN conversations.deleted_at IS 'Soft delete: quando não é NULL, a conversa foi deletada';
COMMENT ON COLUMN messages.deleted_at IS 'Soft delete: quando não é NULL, a mensagem foi deletada';

-- 10. Adicionar soft delete na tabela de documentos (se não existir)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);

-- 11. Adicionar soft delete na tabela de chunks (se não existir)
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_document_chunks_deleted_at ON document_chunks(deleted_at);

-- 12. Atualizar função de busca para EXCLUIR documentos deletados
CREATE OR REPLACE FUNCTION search_teachings(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  source_name text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id as chunk_id,
    dc.document_id,
    d.name as document_name,
    ts.name as source_name,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  JOIN teaching_sources ts ON ts.id = d.source_id
  WHERE
    d.status = 'indexed'
    AND d.deleted_at IS NULL           -- Excluir documentos deletados
    AND dc.deleted_at IS NULL          -- Excluir chunks deletados
    AND ts.is_active = true
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 13. Criar função para soft delete de documento (deleta documento + chunks)
CREATE OR REPLACE FUNCTION soft_delete_document(doc_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Marca o documento como deletado
  UPDATE documents SET deleted_at = NOW() WHERE id = doc_id;

  -- Marca todos os chunks como deletados
  UPDATE document_chunks SET deleted_at = NOW() WHERE document_id = doc_id;
END;
$$;

-- 14. Criar função para restaurar documento
CREATE OR REPLACE FUNCTION restore_document(doc_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Restaura o documento
  UPDATE documents SET deleted_at = NULL WHERE id = doc_id;

  -- Restaura todos os chunks
  UPDATE document_chunks SET deleted_at = NULL WHERE document_id = doc_id;
END;
$$;

SELECT 'Sistema de auditoria criado com sucesso!' as status;
