# Database Audit Report - Sri AB Teachings

**Date**: 2026-01-21
**Auditor**: AIOS DB Audit
**Database**: Supabase PostgreSQL

---

## Executive Summary

- **Tables audited**: 19
- **RLS enabled**: 17/19 (89%)
- **Critical issues**: 2
- **Warnings**: 5
- **Overall Score**: 82/100

---

## Schema Overview

### Core Tables
| Table | PK | created_at | updated_at | RLS | Soft Delete |
|-------|:--:|:----------:|:----------:|:---:|:-----------:|
| profiles | UUID | Yes | Yes (trigger) | Yes | Yes |
| invites | UUID | Yes | No | Yes | No |
| teaching_sources | UUID | Yes | Yes (trigger) | Yes | No |
| documents | UUID | Yes | Yes (trigger) | Yes | Yes |
| document_chunks | UUID | Yes | No | Yes | Yes |
| conversations | UUID | Yes | Yes (trigger) | Yes | Yes |
| messages | UUID | Yes | No | Yes | Yes |
| feedback | UUID | Yes | No | Yes | No |
| audit_logs | UUID | Yes | No | Yes | No |
| response_cache | UUID | Yes | No | Yes | No |

### Module System Tables
| Table | PK | created_at | updated_at | RLS | Soft Delete |
|-------|:--:|:----------:|:----------:|:---:|:-----------:|
| modules | UUID | Yes | Yes | Yes | No |
| user_modules | UUID | Yes | Yes | Yes | No |
| daily_messages | UUID | Yes | Yes (trigger) | Yes | No |
| custom_prompts | UUID | Yes | Yes | Yes | No |
| user_ai_settings | UUID | Yes | Yes (trigger) | Yes | No |

### Theme System Tables
| Table | PK | created_at | updated_at | RLS | Soft Delete |
|-------|:--:|:----------:|:----------:|:---:|:-----------:|
| themes | UUID | Yes | Yes (trigger) | **No** | No |
| document_themes | Composite | Yes | No | **No** | No |

### Audit System Tables
| Table | PK | created_at | updated_at | RLS | Soft Delete |
|-------|:--:|:----------:|:----------:|:---:|:-----------:|
| flagged_content | UUID | Yes | No | Yes | No |
| user_sessions | UUID | Yes | No | Yes | No |

---

## Critical Issues

### 1. Missing RLS on Theme Tables

**Tables Affected**: `themes`, `document_themes`

**Impact**: Security vulnerability - unauthenticated users could potentially access theme data directly via Supabase client.

**Fix**:
```sql
-- Enable RLS
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_themes ENABLE ROW LEVEL SECURITY;

-- Public read for themes (they're not sensitive)
CREATE POLICY "Anyone can view active themes" ON themes
  FOR SELECT USING (is_active = true);

-- Only admins can modify themes
CREATE POLICY "Admins can manage themes" ON themes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authenticated users can view document themes
CREATE POLICY "Authenticated can view document themes" ON document_themes
  FOR SELECT TO authenticated USING (true);

-- Only admins can modify document themes
CREATE POLICY "Admins can manage document themes" ON document_themes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### 2. Overly Permissive Cache Policy

**Table**: `response_cache`

**Current Policy**:
```sql
CREATE POLICY "System can manage cache"
  ON response_cache FOR ALL
  TO authenticated
  USING (true);
```

**Impact**: Any authenticated user can DELETE or modify cache entries, potentially causing DoS or data manipulation.

**Fix**:
```sql
-- Drop existing policy
DROP POLICY IF EXISTS "System can manage cache" ON response_cache;

-- More restrictive policies
CREATE POLICY "Authenticated can read cache" ON response_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage cache" ON response_cache
  FOR ALL TO service_role USING (true);
```

---

## Warnings

### 1. API Keys Stored in Database

**Table**: `user_ai_settings`

**Columns**: `anthropic_api_key`, `openai_api_key`, `gemini_api_key`

**Risk**: Even with application-level encryption, storing API keys in the database is a security risk.

**Recommendation**:
- Ensure proper encryption before storing
- Consider using a secrets manager (e.g., Vault, AWS Secrets Manager)
- Add column-level encryption comments for documentation

### 2. Inconsistent Role Naming

**Issue**: `profiles.role` uses 'member' but `user_modules.role` uses 'viewer', 'editor', 'admin'.

**Impact**: Potential confusion and bugs when checking permissions.

**Recommendation**: Standardize terminology or document the difference clearly.

### 3. Missing updated_at on Some Tables

**Tables without updated_at triggers**:
- `invites`
- `document_chunks`
- `messages`
- `feedback`
- `audit_logs`
- `response_cache`
- `document_themes`
- `flagged_content`
- `user_sessions`

**Impact**: Cannot track when records were last modified.

**Recommendation**: Add `updated_at` columns and triggers where appropriate.

### 4. Index Recommendations

**Missing indexes**:
```sql
-- For better query performance
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_daily_messages_language ON daily_messages(language);
```

### 5. Vector Dimension Consistency

**Current dimension**: 1024 (Voyage AI voyage-2)

**Tables using vectors**:
- `document_chunks.embedding` - VECTOR(1024)
- `response_cache.question_embedding` - VECTOR(1024)
- `themes.embedding` - VECTOR(1024)

All consistent.

---

## RLS Policy Summary

### Profiles
| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Own profile | `auth.uid() = id` |
| SELECT | Admin view all | `is_admin()` |
| UPDATE | Own profile | `auth.uid() = id` |
| UPDATE | Admin update all | `is_admin()` |

### Documents
| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Authenticated | `status = 'indexed'` |
| ALL | Admin | `is_admin()` |

### Conversations & Messages
| Operation | Policy | Condition |
|-----------|--------|-----------|
| ALL | Own | `user_id = auth.uid()` |

### Modules
| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | Anyone | `is_active = true` |
| ALL | Admin | `is_admin()` |

---

## Functions Review

### Helper Functions
| Function | Security | Purpose |
|----------|----------|---------|
| `is_admin()` | DEFINER | Check if user is admin |
| `has_module_access()` | DEFINER | Check module permissions |
| `get_user_modules()` | DEFINER | List user's modules |
| `search_teachings()` | DEFINER | Vector similarity search |
| `search_response_cache()` | INVOKER | Cache lookup |
| `log_audit_action()` | DEFINER | Insert audit log |
| `soft_delete_document()` | INVOKER | Soft delete with chunks |

All functions properly defined.

---

## Triggers Review

| Table | Trigger | Purpose |
|-------|---------|---------|
| profiles | `update_profiles_updated_at` | Auto-update timestamp |
| auth.users | `on_auth_user_created` | Create profile on signup |
| teaching_sources | `update_teaching_sources_updated_at` | Auto-update timestamp |
| documents | `update_documents_updated_at` | Auto-update timestamp |
| documents | `update_source_count` | Maintain source stats |
| conversations | `update_conversations_updated_at` | Auto-update timestamp |
| messages | `update_conversation_on_new_message` | Update conversation stats |
| daily_messages | `trigger_daily_messages_updated_at` | Auto-update timestamp |
| user_ai_settings | `trigger_user_ai_settings_updated_at` | Auto-update timestamp |
| themes | `themes_updated_at` | Auto-update timestamp |

---

## Action Items

| Priority | Action | Estimated Effort |
|----------|--------|------------------|
| P0 | Enable RLS on themes tables | 15 min |
| P0 | Fix response_cache RLS policy | 10 min |
| P1 | Document API key encryption | 30 min |
| P2 | Add missing updated_at columns | 1 hour |
| P2 | Add recommended indexes | 30 min |

---

## SQL Fixes Script

```sql
-- =====================================================
-- FIX 1: Enable RLS on Theme Tables
-- =====================================================
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active themes" ON themes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage themes" ON themes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated can view document themes" ON document_themes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage document themes" ON document_themes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- FIX 2: Restrict response_cache Policy
-- =====================================================
DROP POLICY IF EXISTS "System can manage cache" ON response_cache;

CREATE POLICY "Authenticated can read cache" ON response_cache
  FOR SELECT TO authenticated USING (true);

-- Note: INSERT/UPDATE/DELETE should only be via service role in API routes

-- =====================================================
-- FIX 3: Add Recommended Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_daily_messages_language ON daily_messages(language);
CREATE INDEX IF NOT EXISTS idx_themes_display_order ON themes(display_order);

SELECT 'Database fixes applied!' AS status;
```

---

## Conclusion

The database schema is well-designed with proper use of:
- UUID primary keys
- Foreign key relationships with CASCADE
- RLS policies on most tables
- Vector indexes for semantic search
- Soft delete for data recovery

**Main areas for improvement**:
1. Enable RLS on theme tables (critical)
2. Restrict cache policy (critical)
3. Standardize terminology
4. Add missing timestamps

**Score: 82/100** - Good foundation, needs minor security fixes.
