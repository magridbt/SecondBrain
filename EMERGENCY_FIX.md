# 🚨 EMERGENCY FIX - Database Function Mismatch

**Error Found:** `structure of query does not match function result type`
**Cause:** Code changed but SQL function in database is outdated
**Status:** FIXABLE (2 options)

---

## 🔍 ROOT CAUSE

The error log shows:
```
VECTOR_SEARCH_ERROR: structure of query does not match function result type
⚠️ Vector search failed - falling back to fuzzy text search (lower quality)
```

This means:
1. ✅ Code is sending arrays correctly (after our fixes)
2. ❌ BUT database function `search_teachings` hasn't been updated
3. ❌ Function signature mismatch between code and database

---

## 🛠️ SOLUTION (Pick One)

### Option A: Revert to String Format (Quick Fix - 2 minutes)

If the database function expects strings, revert the changes:

**File: src/lib/semantic-search.ts (Line 71)**
```typescript
// CHANGE THIS BACK:
const embeddingStr = `[${queryEmbedding.join(',')}]`

const { data: chunks, error } = await adminClient.rpc('search_teachings', {
  query_embedding: embeddingStr,  // Back to string
  match_threshold: similarityThreshold,
  match_count: limit,
  filter_language: language || null
})
```

**File: src/lib/process-document.ts (Lines 180, 289)**
```typescript
// CHANGE THESE BACK:
embedding: `[${allEmbeddings[index].join(',')}]`,  // Back to string
```

Then restart server:
```bash
pkill -f "next dev"
npm run dev -- -p 3002
```

---

### Option B: Update Database Function (Better - 5 minutes)

Update the SQL function in Supabase to match the new code:

1. Go to: https://app.supabase.com
2. Navigate to: SQL Editor
3. Run this query:

```sql
-- Drop and recreate search_teachings function with correct signature
DROP FUNCTION IF EXISTS search_teachings(vector, float, int, text) CASCADE;

CREATE OR REPLACE FUNCTION search_teachings(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.35,
  match_count int DEFAULT 5,
  filter_language text DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  source_name text,
  source_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    d.id,
    d.name,
    ts.name,
    ts.id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  JOIN teaching_sources ts ON d.source_id = ts.id
  WHERE d.status = 'indexed'
    AND d.deleted_at IS NULL
    AND dc.deleted_at IS NULL
    AND ts.is_active = true
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (filter_language IS NULL OR d.metadata->>'language' = filter_language)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Test the function
SELECT search_teachings(
  '[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8,1.9,2.0]'::vector(1024),
  0.35,
  5,
  'pt'
) LIMIT 1;
```

Then restart server:
```bash
pkill -f "next dev"
npm run dev -- -p 3002
```

---

## 🎯 WHICH OPTION?

**Choose A if:**
- You want quick fix now
- Database function is complex (don't want to break it)
- Testing code locally only

**Choose B if:**
- You want proper vector type handling
- Ready for production
- Want best performance

---

## 🧪 VERIFY FIX WORKS

After applying fix, test immediately:

```bash
# In browser
http://localhost:3002/app/daily-teaching/chat

# Type: "Existe Deus?"
# Expected: Should return results (not "não encontrei")

# In logs
tail -f /tmp/nextjs-server.log | grep semantic

# Look for:
✅ "✅ Semantic search found X results via vector search"
OR
✅ "✅ Semantic search found X results via fuzzy fallback"

NOT:
❌ "VECTOR_SEARCH_ERROR: structure of query"
```

---

## 📊 WHAT'S HAPPENING NOW

```
Current Flow:
User Question
    ↓
Code tries to send array to search_teachings()
    ↓
Database function expects string format
    ↓
❌ Type mismatch error
    ↓
Falls back to fuzzy text search
    ↓
User sees: "Não encontrei" (not found)
```

---

## ✅ AFTER FIX

```
Fixed Flow:
User Question
    ↓
Code sends correct format (array or string - matching DB)
    ↓
Database function processes correctly
    ↓
✅ Vector search returns 5+ results
    ↓
User sees: "Found teachings on this topic" with sources
```

---

**Choose Option A or B above and apply immediately!**

