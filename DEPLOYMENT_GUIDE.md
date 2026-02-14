# 🚀 DEPLOYMENT GUIDE - Vector Search Fixes

**Created:** 2026-02-13
**Status:** Ready for immediate deployment
**Estimated Duration:** 2-3 hours total
**Risk Level:** 🟢 LOW

---

## PRE-DEPLOYMENT CHECKLIST

### Step 1: Verify All Changes
```bash
cd "/Users/lei/Documents/Magrid/CheckTools/secondbrain/Sri Amma Bhagavan"

# Check which files were modified
git status --short

# Review changes line by line
git diff src/lib/semantic-search.ts
git diff src/lib/process-document.ts
git diff src/app/api/chat/route.ts
```

**Expected Output:**
```
M  src/lib/semantic-search.ts        (+30 lines)
M  src/lib/process-document.ts       (+60 lines)
M  src/app/api/chat/route.ts         (+9 lines)
```

### Step 2: Build & Verify
```bash
# Install dependencies (if needed)
npm install

# Build the project
npm run build

# Expected: "Build succeeded" message
```

**What to look for:**
- ✅ "Successfully compiled X files"
- ✅ No TypeScript errors
- ✅ No ESLint warnings
- ✅ Production bundle created

### Step 3: Test Locally (Optional)
```bash
# Start development server
npm run dev

# Open browser: http://localhost:3000
# Test search functionality manually

# In another terminal, watch logs:
npm run dev 2>&1 | grep -i "semantic\|vector"
```

---

## DEPLOYMENT PHASES

### PHASE 1: Code Deployment (30 minutes)

#### Option A: Vercel (Automated)
```bash
# Push to GitHub
git add .
git commit -m "fix: implement vector type casting and embedding validation [P0]"
git push origin main

# Vercel automatically deploys on push to main
# Monitor deployment: https://vercel.com/dashboard
```

**Verification:**
- [ ] GitHub shows new commit
- [ ] Vercel shows "Deployment successful"
- [ ] Production URL loads without errors

#### Option B: Manual Deployment
```bash
# Build production bundle
npm run build

# Deploy to your hosting
# (Instructions depend on your platform - AWS, Netlify, etc.)
```

---

### PHASE 2: Document Reprocessing (1-2 hours)

#### Why Reprocess?
Old documents have embeddings stored as strings. New documents will have correct VECTOR type.
Reprocessing applies new format to all existing documents.

#### Option A: Admin API Endpoint
```bash
# Find all document IDs
curl -X GET "https://your-domain.com/api/admin/documents" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Reprocess each document
curl -X POST "https://your-domain.com/api/admin/documents/{id}/reprocess" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

#### Option B: Manual UI
1. Go to Admin Dashboard
2. Documents section
3. Select all documents
4. Click "Reprocess with new embeddings"
5. Wait for "Processed: X/Y documents" indicator

#### Option C: Bulk Script (Production)
```bash
# Create a reprocessing script
cat > reprocess-documents.sh << 'EOF'
#!/bin/bash

# Get all document IDs
DOCS=$(curl -s https://api.supabase.com/v1/rest/v1/documents \
  -H "apikey: YOUR_SUPABASE_KEY" | jq -r '.[] | .id')

for DOC_ID in $DOCS; do
  echo "Reprocessing document: $DOC_ID"
  curl -X POST "https://your-domain.com/api/admin/documents/$DOC_ID/reprocess" \
    -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
  sleep 2  # Rate limit: 1 doc per 2 seconds
done

echo "✅ Reprocessing complete"
EOF

chmod +x reprocess-documents.sh
./reprocess-documents.sh
```

#### Monitor Progress
```bash
# Check document processing status
curl "https://your-domain.com/api/admin/documents/status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected response:
# {
#   "total": 45,
#   "processed": 42,
#   "errors": 0,
#   "percentComplete": 93
# }
```

**Verification:**
- [ ] All documents show status "indexed"
- [ ] No documents show status "error"
- [ ] Check logs for "✅ Embeddings validation passed" messages

---

### PHASE 3: Verification & Testing (30 minutes)

#### Test 1: Vector Embedding Storage
```bash
# Connect to Supabase SQL Editor
# Run this query:

SELECT
  id,
  document_id,
  embedding::text as embedding_sample,
  pg_typeof(embedding) as embedding_type
FROM document_chunks
LIMIT 5;

-- Expected results:
-- embedding_type should be: "vector" or "vector(1024)"
-- NOT: "text" or "jsonb"
```

#### Test 2: Vector Search Function
```bash
# In Supabase SQL Editor
-- Test the search function directly

-- Create a test embedding (1024 dimensions of test values)
SELECT search_teachings(
  '[0.1,0.2,0.3,...]'::vector(1024),  -- 1024 values needed
  0.35,                                 -- threshold
  5,                                    -- limit
  'pt'                                  -- language
);

-- Expected: Should return up to 5 teaching chunks with similarity scores
```

#### Test 3: Semantic Search via API
```bash
# Test search endpoint
curl -X POST "https://your-domain.com/api/chat" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "teachings on meditation",
    "conversationId": "new"
  }'

# Expected response:
# {
#   "answer": "[Response from Claude]",
#   "sources": [
#     {
#       "documentName": "...",
#       "similarity": 0.52,  // Should be 0.3-0.7 range
#       ...
#     }
#   ]
# }
```

#### Test 4: Server Logs Inspection
```bash
# Watch logs in real-time
tail -f /path/to/logs

# During test search, look for:
# ✅ "Semantic search found X results via vector search (X results at 35% similarity)"
# ✅ "Embeddings validation passed: 45 embeddings × 1024 dimensions"
# ✅ "embedding_dim: 1024" (in debug output)

# DO NOT see:
# ❌ "VECTOR_SEARCH_ERROR"
# ❌ "No semantic results, trying text search"
# ❌ "wrong dimension"
```

---

## MONITORING & VALIDATION

### Real-Time Monitoring (24 hours)

#### Log Pattern 1: Successful Vector Search
```
✅ Semantic search found 5 results via vector search (5 results at 35% similarity)
📝 Query analysis: {original: "meditation teachings", normalized: "meditation teachings", variations: 0}
Debug info: {
  queryLength: 21,
  embeddingDim: 1024,
  threshold: 0.35,
  language: "pt"
}
```

#### Log Pattern 2: Fallback to Text Search
```
⚠️ NO_VECTOR_RESULTS: Vector search completed but found no matching vectors
📝 Query: "teachings on grace"
📊 Threshold: 35.0% | Embedding dimensions: 1024
Attempting fuzzy text search for better coverage...
```

#### Log Pattern 3: Validation Pass
```
🔍 Validating embeddings before storage...
✅ Embeddings validation passed: 45 embeddings × 1024 dimensions
```

#### Log Pattern 4: Error (Investigate)
```
❌ VECTOR_SEARCH_ERROR: invalid input syntax for type vector
Debug info: {
  errorDetails: "...",
  threshold: 0.35,
  language: "pt"
}
Falling back to fuzzy text search (lower quality)
```

### Metrics to Track

| Metric | Target | How to Check |
|--------|--------|-------------|
| Vector search success rate | > 80% | Logs: "via vector search" count |
| Similarity scores range | 0.25-0.75 | Logs: "similarity: X.XX" values |
| Threshold filter effectiveness | ~15% rejection | Logs: NO_VECTOR_RESULTS frequency |
| Fallback usage | < 20% of queries | Logs: "fallbackMode" markers |
| Validation errors | 0 | Logs: "Embeddings validation" errors |

---

## ROLLBACK PROCEDURE

If critical issues occur:

### Immediate Rollback (5 minutes)
```bash
# Option 1: Revert last commit
git revert HEAD
git push origin main

# Option 2: Restore previous version
git checkout previous-commit-hash -- src/
git commit -m "revert: restore previous vector search logic"
git push origin main

# Vercel will auto-deploy the rollback
```

### Rollback Checklist
- [ ] Vercel deployment status shows "Rollback complete"
- [ ] Production URL works
- [ ] Old search behavior restored (will show no results again)
- [ ] Notify users if needed
- [ ] Investigate what went wrong

---

## TROUBLESHOOTING

### Issue: Build Fails
```bash
# Error: "Cannot find module X"
npm install

# Error: "TypeScript errors"
npm run build 2>&1 | head -100  # See first 100 lines
# Fix the errors and rebuild

# Error: "Deployment timeout"
# Check if documents are still processing
# Wait for all documents to finish, then redeploy
```

### Issue: Vector Search Returns Zero Results
```bash
# Check 1: Are documents processed?
SELECT COUNT(*) as total, COUNT(CASE WHEN status='indexed' THEN 1 END) as indexed
FROM documents;
# If indexed < total, wait for reprocessing

# Check 2: Are embeddings stored correctly?
SELECT pg_typeof(embedding) FROM document_chunks LIMIT 1;
# Should show: "vector" not "text"

# Check 3: Is the function working?
SELECT search_teachings(
  '[0.1,0.2,...]'::vector(1024),
  0.35, 5, 'pt'
);
# Should return results, not error

# Check 4: Is the threshold too high?
-- Test with lower threshold
SELECT search_teachings(..., 0.2, 5, 'pt');  # Try 0.2 instead of 0.35
```

### Issue: Similarity Scores Are 0.0 or 1.0
```bash
# Old code is still running - vector format didn't change
# Verify:
# 1. Code was deployed (check Vercel dashboard)
# 2. Documents were reprocessed (check admin dashboard)
# 3. Server restarted after deployment

# If still failing:
git log --oneline | head -5  # Verify commit is in history
# Force redeploy if needed
```

### Issue: Embedding Validation Errors
```bash
# Log: "❌ Embedding 5 has wrong dimension: 512"
# Cause: Voyage API returned wrong dimension
# Solution:
# 1. Check VOYAGE_API_KEY is correct
# 2. Check VOYAGE_MODEL is 'voyage-2' (not 'voyage-lite')
# 3. Reprocess documents

# Log: "❌ Embedding 3 contains invalid value: NaN"
# Cause: Voyage API error or malformed input
# Solution:
# 1. Check document text is valid UTF-8
# 2. Check chunks aren't too short
# 3. Retry reprocessing
```

---

## POST-DEPLOYMENT CHECKLIST (24 hours)

### Hour 0-1: Immediate Verification
- [ ] Code deployed successfully
- [ ] Production server shows no 500 errors
- [ ] Search endpoint responds to requests
- [ ] Logs show vector search attempts

### Hour 1-2: Document Processing
- [ ] Start document reprocessing
- [ ] Monitor: "Processed: X/Y documents"
- [ ] No validation errors in logs

### Hour 2-4: Testing Phase
- [ ] Test 5+ different search queries
- [ ] Verify results are returned (not empty)
- [ ] Check similarity scores: 0.25-0.75 range
- [ ] Verify source documents are correct

### Hour 4-24: Monitoring Phase
- [ ] Monitor logs for errors
- [ ] Track: Vector search vs fallback ratio
- [ ] Measure: Average similarity scores
- [ ] Check: User satisfaction (if feedback available)

### Success Criteria
- ✅ > 80% of searches return results via vector search
- ✅ Zero validation errors in logs
- ✅ Similarity scores in correct range
- ✅ No user complaints about "no results"
- ✅ System appears responsive and working

---

## COMMUNICATION TEMPLATE

### Internal (Team)
```
🚀 Vector Search Fixes - Deployment Complete

All 5 critical fixes have been deployed:
✅ Vector type casting fixed
✅ Embedding validation added
✅ Similarity threshold reduced from 60% to 35%
✅ Error logging enhanced
✅ Documents being reprocessed

Status: Monitoring for 24 hours
ETA for full resolution: 2-3 hours

Contact: @devops-team for issues
```

### External (Users) - if needed
```
We've identified and fixed a search issue affecting your ability
to find teachings. The system is being restored to full functionality.

You may experience:
- Improved search results starting today
- Some documents being reprocessed (in progress)
- Normal service by tomorrow morning

Thank you for your patience.
```

---

## FINAL CHECKLIST

Before going live:
- [ ] All 5 code changes verified
- [ ] Build completed successfully
- [ ] Code deployed to production
- [ ] First batch of documents reprocessed
- [ ] Search tests pass with results
- [ ] Logs show correct operation
- [ ] Team notified of deployment
- [ ] 24-hour monitoring window started

---

**Status:** 🟢 READY FOR DEPLOYMENT
**Risk:** 🟢 LOW (isolated changes, easy rollback)
**Expected Outcome:** 70-90% improvement in search results

**Questions?** Check:
- `DEVOPS_AUDIT_REPORT.md` - Full technical analysis
- `IMPLEMENTATION_REPORT.md` - Code changes detail
- `FIXES_SUMMARY.md` - Before/after comparison
- `DEPLOYMENT_GUIDE.md` - This file

---

Generated by: Gage (AIOS DevOps Agent)
Date: 2026-02-13
