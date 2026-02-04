# 🧪 How to Run Performance Tests

**QA Guide:** River (QA Specialist)
**Date:** 2026-02-01

---

## 📋 Test Execution Guide

### Prerequisites:
- Node.js 25.3.0+ ✅
- npm 11.7.0+ ✅
- Supabase configured ✅
- .env.local with credentials ✅

---

## 🚀 Running Tests

### **Option 1: Run All Performance Tests**

```bash
# Install dependencies first (if not done)
npm install

# Run all tests
npm run test:run -- tests/performance-validation.test.ts

# Or with UI
npm run test:ui -- tests/performance-validation.test.ts
```

### **Option 2: Run Specific Test Suite**

```bash
# Database tests only
npm run test:run -- tests/performance-validation.test.ts -t "Database Indexes"

# Cache tests only
npm run test:run -- tests/performance-validation.test.ts -t "Cache Strategy"

# Frontend tests only
npm run test:run -- tests/performance-validation.test.ts -t "Frontend Performance"

# API tests only
npm run test:run -- tests/performance-validation.test.ts -t "API Optimization"

# Monitoring tests only
npm run test:run -- tests/performance-validation.test.ts -t "Monitoring"

# Regression tests only
npm run test:run -- tests/performance-validation.test.ts -t "Regression Testing"
```

### **Option 3: Run with Coverage**

```bash
npm run test:coverage -- tests/performance-validation.test.ts
```

---

## 📊 Expected Test Output

```
✓ 🚀 Performance Optimization Validation (19 tests)

  1️⃣ Database Indexes (3 tests)
    ✓ DB-001: Should have 12 performance indexes created
    ✓ DB-002: Vector search with HNSW should be fast
    ✓ DB-003: Composite indexes exist for frequent queries

  2️⃣ Cache Strategy (3 tests)
    ✓ CACHE-001: Response cache should return consistent data
    ✓ CACHE-002: Session cache TTL should be 24 hours
    ✓ CACHE-003: Embedding cache TTL should be 30 days

  3️⃣ Frontend Performance (3 tests)
    ✓ FE-001: Next.js config has optimization flags
    ✓ FE-002: Dynamic imports configured for code splitting
    ✓ FE-003: Image optimization for WebP/AVIF

  4️⃣ API Optimization (3 tests)
    ✓ API-001: Cache headers configured correctly
    ✓ API-002: Compression headers enabled
    ✓ API-003: Response time targets defined

  5️⃣ Monitoring & Tracking (3 tests)
    ✓ MON-001: Sentry DSN configured
    ✓ MON-002: Performance tracking functions exported
    ✓ MON-003: Web Vitals thresholds defined

  6️⃣ Regression Testing (3 tests)
    ✓ REG-001: Database connection still works
    ✓ REG-002: Supabase Auth still functional
    ✓ REG-003: Storage still accessible

  7️⃣ Performance Summary (1 test)
    ✓ Should meet all performance targets

✓ 19 passed
```

---

## 🔍 Manual Validation Steps

### **1. Database Indexes**

Run in Supabase SQL Editor:

```sql
-- Check all indexes exist
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;

-- Should show 12+ indexes including:
-- - idx_chunks_embedding_hnsw
-- - idx_documents_user_created
-- - idx_conversations_user_updated
-- - idx_messages_conversation_created
-- - idx_profiles_role_active
-- - idx_invites_email_active
-- - idx_teaching_sources_active
-- - idx_conversations_title_search
-- - idx_cache_question_embedding
-- - idx_feedback_rating_created
-- - idx_chunks_document_index
-- - idx_documents_source_status
```

### **2. Test Bundle Size**

```bash
# Build project
npm run build

# Check .next folder size
du -sh .next/

# Check if < 300KB expected
# Output: ~300KB or less = ✅ SUCCESS
```

### **3. Test Cache Headers**

```bash
# Start dev server
npm run dev

# In another terminal, use curl to check headers
curl -I http://localhost:3000/

# Look for:
# Cache-Control: public, max-age=3600, s-maxage=3600
# Vary: Accept-Encoding
# X-Content-Type-Options: nosniff
```

### **4. Test Compression**

```bash
# Using curl with gzip
curl -I --compressed http://localhost:3000/

# Should show:
# Content-Encoding: gzip
# Transfer-Encoding: chunked
```

### **5. Test Performance in Browser**

1. Open DevTools (F12)
2. Go to Performance tab
3. Record page load
4. Check metrics:
   - First Contentful Paint: < 1.5s ✅
   - Largest Contentful Paint: < 2.5s ✅
   - Cumulative Layout Shift: < 0.1 ✅

### **6. Validate Sentry Setup**

1. Go to Sentry Dashboard
2. Create test event:
   ```javascript
   Sentry.captureMessage('Test message', 'info');
   ```
3. Should appear in Sentry within seconds

---

## 📈 Performance Load Test

### Using Apache Bench

```bash
# Install ab (macOS)
# brew install httpd

# Single request test
ab -n 1 -c 1 http://localhost:3000/api/health

# Load test: 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:3000/api/health

# Look for:
# Requests per second: high number ✅
# Failed requests: 0
# Time per request: < 5000ms
```

### Using k6

```bash
# Install k6
# brew install k6

# Create test file: load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,      // 10 virtual users
  duration: '30s' // 30 seconds
};

export default function() {
  let res = http.get('http://localhost:3000/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 5s': (r) => r.timings.duration < 5000
  });
}

# Run test
k6 run load-test.js
```

---

## ✅ Sign-Off Checklist

After running tests, verify:

- [ ] All 19 unit tests passing
- [ ] Bundle size < 300KB
- [ ] Cache headers visible with curl
- [ ] Compression working
- [ ] Performance metrics < targets
- [ ] Zero regressions
- [ ] Sentry event appearing

---

## 🚨 Troubleshooting

### Tests failing?

1. Check .env.local credentials
2. Verify Supabase connection
3. Run `npm install` again
4. Clear cache: `npm run build && npm run test:run`

### Bundle size larger than expected?

1. Check if source maps disabled: `productionBrowserSourceMaps: false`
2. Run `npm run build`
3. Check `.next/static/chunks` size
4. Look for large dependencies in package.json

### Cache headers not appearing?

1. Verify middleware.ts is updated
2. Clear .next folder: `rm -rf .next`
3. Rebuild: `npm run build`
4. Check headers again with curl

---

## 📞 Need Help?

**QA Specialist:** River
**Docs:** See QA_VALIDATION_REPORT.md
**Implementation:** See PERFORMANCE_IMPLEMENTATION.md

---

*Happy Testing! 🧪*
