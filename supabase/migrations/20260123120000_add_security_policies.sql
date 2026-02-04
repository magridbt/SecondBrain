-- =====================================================
-- Migration: Security Policies Enhancement
-- Date: 2026-01-23
-- Purpose: Add missing RLS policies and security functions
-- =====================================================

-- =====================================================
-- 1. FUNCTION: Update Prompt Usage Stats (SECURITY DEFINER)
-- This allows any authenticated user to update usage stats
-- on any prompt they use (including public prompts)
-- Only updates usage_count and last_used_at - no other columns
-- =====================================================

CREATE OR REPLACE FUNCTION increment_prompt_usage(prompt_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prompt_exists BOOLEAN;
BEGIN
  -- Verify the prompt exists and is either owned by user or is public
  SELECT EXISTS (
    SELECT 1 FROM custom_prompts
    WHERE id = prompt_id
    AND (user_id = auth.uid() OR (is_public = true AND is_active = true))
  ) INTO prompt_exists;

  IF NOT prompt_exists THEN
    RETURN FALSE;
  END IF;

  -- Update only usage stats
  UPDATE custom_prompts
  SET
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = NOW()
  WHERE id = prompt_id;

  RETURN TRUE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_prompt_usage(UUID) TO authenticated;

COMMENT ON FUNCTION increment_prompt_usage IS
'Safely increments usage statistics for a prompt. Users can call this on their own prompts or public prompts.';

-- =====================================================
-- 2. Add deleted_at column to document_chunks if missing
-- (for soft delete support)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_chunks'
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE document_chunks ADD COLUMN deleted_at TIMESTAMPTZ;
    CREATE INDEX idx_document_chunks_deleted ON document_chunks(deleted_at) WHERE deleted_at IS NULL;
  END IF;
END $$;

-- =====================================================
-- 3. Ensure documents table has proper read policy
-- for authenticated users to view document metadata
-- =====================================================

-- Drop if exists to recreate with correct definition
DROP POLICY IF EXISTS "Authenticated users can view documents for viewer" ON documents;

-- Allow authenticated users to view non-deleted documents (for document viewer)
CREATE POLICY "Authenticated users can view documents for viewer" ON documents
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- =====================================================
-- 4. Ensure document_chunks has proper read policy
-- for document viewer (regardless of document status)
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view chunks for viewer" ON document_chunks;

-- Allow authenticated users to view chunks of non-deleted documents
CREATE POLICY "Authenticated users can view chunks for viewer" ON document_chunks
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_chunks.document_id
      AND documents.deleted_at IS NULL
    )
  );

-- =====================================================
-- 5. Add admin policies for document_chunks
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage document chunks" ON document_chunks;

CREATE POLICY "Admins can manage document chunks" ON document_chunks
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 6. Add module_access column to profiles if missing
-- (for module-based access control)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'module_access'
  ) THEN
    ALTER TABLE profiles ADD COLUMN module_access TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- =====================================================
-- 7. Function: Check module access
-- =====================================================

CREATE OR REPLACE FUNCTION has_module_access(user_uuid UUID, module_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_modules TEXT[];
BEGIN
  -- Get user role and modules
  SELECT role, COALESCE(module_access, '{}')
  INTO user_role, user_modules
  FROM profiles
  WHERE id = user_uuid AND deleted_at IS NULL;

  -- Admins have access to everything
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check if module is in user's access list
  RETURN module_slug = ANY(user_modules);
END;
$$;

GRANT EXECUTE ON FUNCTION has_module_access(UUID, TEXT) TO authenticated;

-- =====================================================
-- 8. Verification Query
-- =====================================================

SELECT
  'Security Policies Enhanced!' AS status,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'increment_prompt_usage') AS increment_func_exists,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'has_module_access') AS module_func_exists,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'documents') AS document_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'document_chunks') AS chunk_policies;
