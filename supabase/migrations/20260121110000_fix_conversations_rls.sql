-- =====================================================
-- Migration: Fix Conversations and Messages RLS
-- Date: 2026-01-21
-- Issue: Users cannot soft-delete their own conversations
-- =====================================================

-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

-- Enable RLS (if not already enabled)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own conversations
CREATE POLICY "Users can create own conversations" ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own conversations (for soft delete)
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own conversations (hard delete if needed)
CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- MESSAGES TABLE
-- =====================================================

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can create own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- Enable RLS (if not already enabled)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages from their own conversations
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Users can create messages in their own conversations
CREATE POLICY "Users can create own messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Users can update messages in their own conversations (for soft delete)
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Users can delete messages in their own conversations
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- =====================================================
-- Verification
-- =====================================================
SELECT
  'Conversations and Messages RLS Fixed!' AS status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversations') AS conv_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'messages') AS msg_policies;
