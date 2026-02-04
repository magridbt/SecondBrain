# 🧪 QA Test Plan
## Performance Optimization Validation

**Owner:** River (QA Specialist)
**Date:** 2026-02-01
**Status:** In Progress

---

## 📋 Test Scope

### What We're Testing:
1. ✅ Database Indexes (12 indices)
2. ✅ Cache Strategy (Redis)
3. ✅ Frontend Performance (Bundle size, LCP, FCP)
4. ✅ API Optimization (Headers, compression)
5. ✅ Monitoring & Tracking (Sentry)

### Success Criteria:
- [ ] All 12 database indices created
- [ ] Cache hit rate > 80%
- [ ] Response time p95 < 5s
- [ ] Bundle size reduction > 30%
- [ ] Zero regressions in existing functionality
- [ ] Web Vitals all in "good" range

---

## 🔧 Test Environment Setup

### Requirements:
- Node.js 25.3.0 ✅
- npm 11.7.0 ✅
- PostgreSQL (via Supabase) ✅
- Redis (Upstash) ✅
- Sentry account ✅

### Checklist:
- [ ] .env.local configurado
- [ ] Supabase migrations executadas
- [ ] npm dependencies instaladas
- [ ] Build local validado
- [ ] Sentry connected

---

## 📊 Test Cases

### 1. DATABASE INDEX VALIDATION

**Test ID:** DB-001
**Name:** Validate all 12 indexes created
**Steps:**
1. Connect to Supabase
2. Execute: `SELECT * FROM pg_indexes WHERE schemaname='public'`
3. Count indexes
4. Verify HNSW for vector search
5. Verify composite indexes exist

**Expected:** 12 indexes, including:
- idx_chunks_embedding_hnsw
- idx_documents_user_created
- idx_conversations_user_updated
- idx_messages_conversation_created
- idx_profiles_role_active
- idx_invites_email_active
- etc.

**Acceptance:** All 12 present and active

---

**Test ID:** DB-002
**Name:** Validate vector search performance
**Steps:**
1. Create test document with embeddings
2. Measure search time with index
3. Compare vs without index
4. Measure similarity accuracy

**Expected:** Search time < 100ms with index

---

### 2. CACHE STRATEGY VALIDATION

**Test ID:** CACHE-001
**Name:** Response cache functionality
**Steps:**
1. Make RAG query → Response A
2. Measure time: T1
3. Make identical query → Response B
4. Measure time: T2
5. Verify Response A === Response B
6. Verify T2 < 100ms (cache hit)

**Expected:** T2 < 100ms, responses identical

---

**Test ID:** CACHE-002
**Name:** Session cache TTL
**Steps:**
1. Cache user session
2. Wait 1 minute
3. Retrieve → Should exist
4. Wait 86400 seconds (24h)
5. Retrieve → Should be expired

**Expected:** TTL working correctly

---

**Test ID:** CACHE-003
**Name:** Embedding cache functionality
**Steps:**
1. Cache embedding
2. Retrieve embedding
3. Verify data integrity
4. Check TTL (30 days)

**Expected:** Embedding retrieved correctly

---

### 3. FRONTEND PERFORMANCE VALIDATION

**Test ID:** FE-001
**Name:** Bundle size reduction
**Steps:**
1. Run: `npm run build`
2. Check .next/static/chunks size
3. Compare vs baseline
4. Verify reduction > 30%

**Expected:** Bundle size < 300KB (from ~500KB)

---

**Test ID:** FE-002
**Name:** Image optimization
**Steps:**
1. Build project
2. Verify WebP/AVIF generation
3. Check lazy loading working
4. Validate placeholder blur

**Expected:** Images in multiple formats

---

**Test ID:** FE-003
**Name:** Dynamic imports working
**Steps:**
1. Verify code splitting in .next/static
2. Check chat component lazy loads
3. Check admin panel lazy loads
4. Validate bundle split

**Expected:** Separate chunks for admin, chat, core

---

### 4. API OPTIMIZATION VALIDATION

**Test ID:** API-001
**Name:** Cache headers set correctly
**Steps:**
1. Make request to static asset
2. Check headers: Cache-Control
3. Verify value: "public, max-age=31536000"
4. Repeat for HTML, API, etc.

**Expected:** Correct cache headers per content type

---

**Test ID:** API-002
**Name:** Compression enabled
**Steps:**
1. Make request with Accept-Encoding: gzip
2. Verify response compressed
3. Measure size reduction
4. Verify > 70% reduction

**Expected:** Compressed response, 70%+ reduction

---

**Test ID:** API-003
**Name:** Response time < 5s
**Steps:**
1. Make RAG query
2. Measure end-to-end time
3. Repeat 10x
4. Calculate p95
5. Verify < 5s

**Expected:** p95 response time < 5 seconds

---

### 5. MONITORING VALIDATION

**Test ID:** MON-001
**Name:** Sentry connection
**Steps:**
1. Verify NEXT_PUBLIC_SENTRY_DSN set
2. Make test error
3. Check appears in Sentry
4. Verify tags and context

**Expected:** Error in Sentry with full context

---

**Test ID:** MON-002
**Name:** Web Vitals tracking
**Steps:**
1. Open app in browser
2. Inspect performance metrics
3. Verify FCP, LCP, CLS reported
4. Check in Sentry dashboard

**Expected:** Metrics visible in Sentry

---

## ⚠️ Regression Testing

**Test ID:** REG-001
**Name:** Existing functionality not broken
**Steps:**
1. Test user authentication
2. Test chat functionality
3. Test document upload
4. Test admin dashboard
5. Test database queries

**Expected:** All features work as before

---

## 📈 Performance Benchmarks

### Target Metrics:

| Metric | Target | Acceptance |
|--------|--------|-----------|
| Database Query | < 150ms | ✅ 70% reduction |
| Cache Hit Rate | > 80% | ✅ Cache working |
| Bundle Size | < 300KB | ✅ 40% reduction |
| Response Time p95 | < 5s | ✅ Sub-5s |
| LCP | < 2.5s | ✅ Good Web Vital |
| FCP | < 1.5s | ✅ Good Web Vital |
| CLS | < 0.1 | ✅ Good Web Vital |

---

## 🚀 Test Execution Order

1. **Setup** (5 min)
   - [ ] Environment configured
   - [ ] .env.local set
   - [ ] Dependencies installed

2. **Database** (10 min)
   - [ ] Indexes created (DB-001)
   - [ ] Search performance (DB-002)

3. **Cache** (15 min)
   - [ ] Response cache (CACHE-001)
   - [ ] Session cache (CACHE-002)
   - [ ] Embedding cache (CACHE-003)

4. **Frontend** (15 min)
   - [ ] Bundle size (FE-001)
   - [ ] Images (FE-002)
   - [ ] Code splitting (FE-003)

5. **API** (15 min)
   - [ ] Headers (API-001)
   - [ ] Compression (API-002)
   - [ ] Response time (API-003)

6. **Monitoring** (10 min)
   - [ ] Sentry (MON-001)
   - [ ] Web Vitals (MON-002)

7. **Regression** (10 min)
   - [ ] All features work (REG-001)

**Total Time:** ~90 minutes

---

## 📊 Exit Criteria

- [x] All test cases defined
- [ ] All test cases executed
- [ ] All critical tests PASSED
- [ ] No regressions detected
- [ ] Performance targets met
- [ ] Ready for production deployment

---

**Next Step:** Execute tests in sequence

*River, QA Specialist*
