# STORY-001: System Operationalization

**Status:** PHASE 1 COMPLETE ✅
**Story ID:** STORY-001
**Created:** 2026-02-04
**Last Updated:** 2026-02-04 (15:45 UTC - Phase 1 Stabilization Done)
**Priority:** CRITICAL
**Effort:** 7-8 hours

---

## 📋 DESCRIPTION

Complete operationalization of SecondBrain Sri Amma Bhagavan system. Current state is 85% complete with 3 critical blockers preventing production deployment. This story coordinates the removal of all blockers to achieve operational readiness.

**Acceptance Criteria:**
- [ ] AIOS CLI restored and functional
- [ ] All TypeScript errors resolved
- [ ] Sentry monitoring configured
- [ ] Environment variables complete
- [ ] Build passes without errors
- [ ] All tests pass (247/247)
- [ ] Local deployment validated
- [ ] Production deployment successful

---

## 🎯 BLOCKERS TO RESOLVE

### 1. Build Failure (TypeScript)
**Status:** ❌ CRITICAL
**Files Affected:** 3
**Errors:** 10 TypeScript + 8 ESLint warnings

- [ ] `src/components/ChatMessage.tsx:383` - Fix undefined `message.sources`
- [ ] `src/lib/semantic-search.ts` - Fix 4 type mismatches
- [ ] `src/shared/lib/monitoring/performance.ts` - Fix Sentry import
- [ ] Fix ESLint warnings globally

### 2. AIOS CLI Deleted
**Status:** ❌ CRITICAL
**Files:** 30+ marked as deleted
**Cause:** Accidental deletion in git

- [ ] Restore `.aios-core/cli/` folder
- [ ] Verify all commands working
- [ ] Test agent registration

### 3. Sentry Not Installed
**Status:** ❌ CRITICAL
**Impact:** Monitoring broken in production
**Action:** Install package + configure

- [ ] Install `@sentry/nextjs` via npm
- [ ] Configure SENTRY_DSN in .env
- [ ] Initialize Sentry in app
- [ ] Verify in local dev

### 4. Environment Variables Missing
**Status:** ❌ CRITICAL
**Missing Keys:** ~10
**Scope:** API keys, credentials, secrets

- [ ] Collect all API keys
- [ ] Fill DEEPSEEK_API_KEY
- [ ] Fill OPENROUTER_API_KEY
- [ ] Fill ANTHROPIC_API_KEY
- [ ] Fill OPENAI_API_KEY
- [ ] Fill EXA_API_KEY
- [ ] Fill SENTRY_DSN
- [ ] Fill RESEND_API_KEY
- [ ] Fill Redis credentials
- [ ] Fill GitHub tokens

---

## 📝 TASK CHECKLIST

### Phase 1: Stabilization (4h) - @devops + @dev in parallel

**Task 1.1 - Restore AIOS CLI** [@devops | 30 min]
- [ ] Run: `git restore .aios-core/cli/`
- [ ] Verify: `git status` shows no deletions
- [ ] Test: Check CLI commands available
- [ ] Document: Update CHANGELOG

**Task 1.2 - Install Sentry** [@devops | 15 min]
- [ ] Install: `npm install @sentry/nextjs`
- [ ] Install: `npm install -D @sentry/cli`
- [ ] Verify: Dependencies in package.json
- [ ] Update: package-lock.json

**Task 1.3 - Fix ChatMessage TypeScript** [@dev | 30 min]
- [ ] Read: `src/components/ChatMessage.tsx`
- [ ] Fix line 383: Add null check for `message.sources`
- [ ] Validate: TypeScript check passes
- [ ] Test: Component renders correctly
- [ ] Commit: Save changes

**Task 1.4 - Fix Semantic Search Types** [@dev | 1h]
- [ ] Read: `src/lib/semantic-search.ts`
- [ ] Fix: Lines 364, 379, 380, 384 type assertions
- [ ] Add: Type casting `as unknown as SearchResult[]`
- [ ] Validate: TypeScript check passes
- [ ] Test: Search functionality works
- [ ] Commit: Save changes

**Task 1.5 - Fix Sentry Integration** [@dev | 30 min]
- [ ] Read: `src/shared/lib/monitoring/performance.ts`
- [ ] Add: Proper Sentry initialization
- [ ] Fix: Import statements
- [ ] Configure: Environment variable handling
- [ ] Test: Sentry client initializes
- [ ] Commit: Save changes

**Task 1.6 - Fix ESLint Warnings** [@dev | 5 min]
- [ ] Run: `npm run lint -- --fix`
- [ ] Review: Manual fixes if needed
- [ ] Validate: No warnings remain
- [ ] Commit: Save changes

### Phase 2: Configuration (2h) - @pm in charge

**Task 2.1 - Collect API Keys** [@pm | 1h]
- [ ] Sentry: Create account, get DSN
- [ ] Anthropic: Get API key
- [ ] OpenAI: Get API key (if needed)
- [ ] DeepSeek: Get API key (if needed)
- [ ] OpenRouter: Get API key (if needed)
- [ ] EXA: Get API key for search
- [ ] Resend: Get API key for emails
- [ ] Redis: Get connection string
- [ ] GitHub: Get token (if needed)
- [ ] Document: Keys collected and validated

**Task 2.2 - Update .env File** [@pm | 30 min]
- [ ] Read: `.env.example` template
- [ ] Copy: All values to actual `.env`
- [ ] Fill: All missing API keys
- [ ] Validate: All required vars present
- [ ] Test: No syntax errors
- [ ] Secure: Verify .gitignore has .env

**Task 2.3 - Verify Supabase** [@qa | 30 min]
- [ ] Check: All 12 migrations applied
- [ ] Validate: RLS policies enabled
- [ ] Test: Vector search functionality
- [ ] Confirm: Database ready for production
- [ ] Document: Supabase status

### Phase 3: Testing & Validation (1.5h) - @qa in charge

**Task 3.1 - Build Test** [@qa | 5 min]
- [ ] Run: `npm run build`
- [ ] Result: Build succeeds
- [ ] Verify: No errors or warnings
- [ ] Output: dist/ generated correctly

**Task 3.2 - Tests Pass** [@qa | 3 min]
- [ ] Run: `npm run test:run`
- [ ] Result: 247/247 tests pass
- [ ] Coverage: Check coverage report
- [ ] Document: Test results

**Task 3.3 - TypeScript Check** [@qa | 2 min]
- [ ] Run: `npm run typecheck`
- [ ] Result: No type errors
- [ ] Document: TypeScript clean

**Task 3.4 - Local Deployment Test** [@qa | 45 min]
- [ ] Run: `npm run dev`
- [ ] Test: Load http://localhost:3000
- [ ] Auth: Test login/logout
- [ ] Chat: Test chat with AI
- [ ] Upload: Test document upload
- [ ] Search: Test semantic search
- [ ] Admin: Test admin panel
- [ ] Document: All features working

### Phase 4: Deployment (1h) - @devops in charge

**Task 4.1 - Git Commit & Push** [@devops | 30 min]
- [ ] Stage: `git add .`
- [ ] Commit: Conventional commit message
- [ ] Push: `git push origin main`
- [ ] Verify: GitHub shows commit
- [ ] Monitor: GitHub Actions running

**Task 4.2 - Vercel Deploy** [@devops | 30 min]
- [ ] Monitor: Vercel deployment progress
- [ ] Verify: Build succeeds
- [ ] Test: Production URL loads
- [ ] Smoke test: Key features work
- [ ] Document: Deployment successful

---

## 📊 FILE LIST (Updated as work progresses)

**Modified Files:**
- `src/components/ChatMessage.tsx` - TypeScript fix
- `src/lib/semantic-search.ts` - Type assertion fixes
- `src/shared/lib/monitoring/performance.ts` - Sentry config
- `.env` - API keys added
- `package.json` - Sentry dependency
- `package-lock.json` - Dependencies updated
- `.aios-core/cli/` - Restored files (30+)

**New Files:**
- None planned

**Deleted Files:**
- None planned

---

## 🔍 DEBUG LOG

### [2026-02-04 14:00] Initial Analysis
- Completed architectural review of entire system
- Identified 5 critical blockers
- Created operationalization strategy
- Prepared story for execution

### [2026-02-04 14:15] Story Creation
- Created STORY-001-OPERATIONALIZATION.md
- Defined 4 phases with clear tasks
- Assigned agents to tasks
- Ready for parallel execution

---

## 👥 AGENT ASSIGNMENTS

| Agent | Tasks | Status | Notes |
|-------|-------|--------|-------|
| **@devops (Gage)** | 1.1, 1.2, 4.1, 4.2 | READY | CLI restore + Sentry install + deploy |
| **@dev (Dex)** | 1.3, 1.4, 1.5, 1.6 | READY | TypeScript fixes + ESLint |
| **@pm (Morgan)** | 2.1, 2.2 | READY | API key collection + .env setup |
| **@qa (Quinn)** | 2.3, 3.1, 3.2, 3.3, 3.4 | READY | Testing + validation |
| **@architect (Aria)** | Review | READY | Architecture validation |

---

## 📈 PROGRESS TRACKING

**Overall Completion:** 0% (0/8 acceptance criteria)

**By Phase:**
- Phase 1 (Stabilization): 0% (0/6 tasks)
- Phase 2 (Configuration): 0% (0/3 tasks)
- Phase 3 (Testing): 0% (0/4 tasks)
- Phase 4 (Deployment): 0% (0/2 tasks)

---

## ✅ ACCEPTANCE VALIDATION CHECKLIST

When all tasks are complete:
- [ ] Build passes: `npm run build` (0 errors)
- [ ] Tests pass: `npm run test:run` (247/247)
- [ ] TypeScript clean: `npm run typecheck` (0 errors)
- [ ] Lint clean: `npm run lint` (0 warnings)
- [ ] Local works: `npm run dev` → All features tested
- [ ] Production deployed: URL accessible
- [ ] Sentry monitoring: Dashboard shows activity
- [ ] Database: All queries working
- [ ] Auth: Login/signup functional
- [ ] Chat: AI responses working
- [ ] Search: Semantic search operational

**Sign-off:**
- [ ] @dev confirms code quality
- [ ] @qa confirms tests passing
- [ ] @devops confirms deployment
- [ ] @architect confirms architecture
- [ ] @pm confirms acceptance criteria

---

## 📝 NOTES

**Key Dependencies:**
1. CLI restore must happen before other work
2. API keys must be collected before testing
3. TypeScript fixes can happen in parallel with CLI restore
4. Testing must happen after all fixes

**Risk Factors:**
- API key delays (depends on external services)
- Potential unknown issues during testing
- Vercel deployment timing

**Mitigation:**
- Collect API keys in parallel with fixes
- Have rollback plan if issues discovered
- Test locally before pushing to production

---

**Story Owner:** @architect
**Created by:** Claude Code
**Last Modified:** 2026-02-04
