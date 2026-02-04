# Sri AB Teachings - Setup Guide

**Version:** 1.2.0
**Last Updated:** 2026-01-21

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Supabase Configuration](#3-supabase-configuration)
4. [Environment Variables](#4-environment-variables)
5. [Database Setup](#5-database-setup)
6. [AI Providers Setup](#6-ai-providers-setup)
7. [Running the Application](#7-running-the-application)
8. [Production Deployment](#8-production-deployment)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or higher | Runtime environment |
| npm | 9.x or higher | Package manager |
| Git | 2.x or higher | Version control |

### Required Accounts

| Service | Purpose | Sign Up |
|---------|---------|---------|
| Supabase | Database & Auth | https://supabase.com |
| Anthropic | Claude AI | https://console.anthropic.com |
| OpenAI | Embeddings & ChatGPT | https://platform.openai.com |
| Google AI | Gemini (optional) | https://aistudio.google.com |

### Recommended Tools

- VS Code or similar IDE
- Supabase CLI (optional)
- Postman or Insomnia (API testing)

---

## 2. Local Development Setup

### 2.1 Clone the Repository

```bash
git clone <repository-url>
cd sri-ab-teachings
```

### 2.2 Install Dependencies

```bash
npm install
```

### 2.3 Create Environment File

```bash
cp .env.example .env.local
```

### 2.4 Verify Installation

```bash
npm run dev
```

The application should start at `http://localhost:3000`.

---

## 3. Supabase Configuration

### 3.1 Create a New Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name:** sri-ab-teachings
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to your users
4. Wait for project creation

### 3.2 Get API Keys

1. Go to **Project Settings > API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### 3.3 Configure Authentication

1. Go to **Authentication > URL Configuration**
2. Set **Site URL:** `http://localhost:3000` (dev) or your production URL
3. Add **Redirect URLs:**
   ```
   http://localhost:3000/reset-password
   http://localhost:3000/invite
   https://yourdomain.com/reset-password
   https://yourdomain.com/invite
   ```

### 3.4 Enable Required Extensions

Go to **Database > Extensions** and enable:

- `pgvector` - For semantic search embeddings
- `uuid-ossp` - For UUID generation

---

## 4. Environment Variables

### Complete `.env.local` File

```env
# ===========================================
# SUPABASE CONFIGURATION
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ===========================================
# AI PROVIDERS - API Keys
# ===========================================
# Claude (Anthropic) - Required for chat
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# OpenAI - Required for embeddings
OPENAI_API_KEY=sk-xxxxx
OPENAI_API_KEY_EMBEDDINGS=sk-xxxxx

# Gemini (Google) - Optional
GEMINI_API_KEY=AIzaxxxxx

# ===========================================
# SECURITY
# ===========================================
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=your-32-char-encryption-key

# ===========================================
# OPTIONAL SETTINGS
# ===========================================
# Rate limiting (requests per minute)
RATE_LIMIT_CHAT=20
RATE_LIMIT_GENERATE=10
```

### Environment Variables Explained

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key for client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for server |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `OPENAI_API_KEY` | Yes | OpenAI API key (for embeddings) |
| `OPENAI_API_KEY_EMBEDDINGS` | Yes | Same or different key for embeddings |
| `GEMINI_API_KEY` | No | Google Gemini API key |
| `ENCRYPTION_KEY` | Yes | For encrypting user API keys |

---

## 5. Database Setup

### 5.1 Run Migrations

Navigate to `supabase/migrations/` and run each SQL file in order.

**Option A: Supabase Dashboard**
1. Go to **SQL Editor**
2. Paste and run each migration file
3. Run in chronological order

**Option B: Supabase CLI**
```bash
supabase db push
```

### 5.2 Migration Files

Run these migrations in order:

```
001_initial_schema.sql      - Core tables (profiles, conversations, messages)
002_documents.sql           - Document management tables
003_teaching_sources.sql    - Teaching source categories
004_embeddings.sql          - Vector embeddings setup
005_audit.sql               - Audit logging
006_modules.sql             - Module system
007_user_modules.sql        - User module access
008_daily_teaching.sql      - Daily teaching tables
009_user_ai_settings.sql    - AI settings per user
010_custom_prompts.sql      - Custom prompts table
```

### 5.3 Seed Initial Data

#### Teaching Sources

```sql
INSERT INTO teaching_sources (name, slug, description) VALUES
('81000 Program', '81000-program', 'Ensinamentos do programa 81000'),
('Kalki Dharma', 'kalki-dharma', 'Dharma de Kalki'),
('Great Compassionate Light', 'great-compassionate-light', 'Grande Luz Compassiva'),
('Sri AB Original', 'sri-ab-original', 'Ensinamentos originais de Sri AB'),
('Tejasaji', 'tejasaji', 'Ensinamentos de Tejasaji');
```

#### Modules

```sql
INSERT INTO modules (name, slug, description, icon, is_active) VALUES
('Sri AB Teachings', 'sri-ab-teachings', 'Chat com busca semântica nos ensinamentos', 'book-open', true),
('Daily Teaching', 'daily-teaching', 'Gerar mensagens diárias inspiradoras', 'sun', true);
```

### 5.4 Create First Admin User

1. Register a user through the application
2. Update their role to admin:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

3. Give admin access to all modules:

```sql
INSERT INTO user_modules (user_id, module_id, role)
SELECT
  p.id,
  m.id,
  'admin'
FROM profiles p
CROSS JOIN modules m
WHERE p.email = 'admin@example.com';
```

---

## 6. AI Providers Setup

### 6.1 Anthropic (Claude)

1. Go to https://console.anthropic.com
2. Create an account or sign in
3. Navigate to **API Keys**
4. Create a new API key
5. Copy and add to `.env.local` as `ANTHROPIC_API_KEY`

**Key Format:** `sk-ant-api03-xxxxx`

### 6.2 OpenAI

1. Go to https://platform.openai.com
2. Create an account or sign in
3. Navigate to **API Keys**
4. Create a new secret key
5. Copy and add to `.env.local` as `OPENAI_API_KEY`

**Key Format:** `sk-xxxxx`

**Important:** OpenAI is required for generating embeddings, even if you use Claude or Gemini for chat.

### 6.3 Google Gemini (Optional)

1. Go to https://aistudio.google.com
2. Sign in with Google account
3. Navigate to **Get API Key**
4. Create a new key
5. Copy and add to `.env.local` as `GEMINI_API_KEY`

**Key Format:** `AIzaxxxxx`

---

## 7. Running the Application

### 7.1 Development Mode

```bash
npm run dev
```

Access at: http://localhost:3000

### 7.2 Build for Production

```bash
npm run build
```

### 7.3 Run Production Build

```bash
npm start
```

### 7.4 Linting and Type Checking

```bash
# Run linter
npm run lint

# Run type checker
npm run typecheck

# Run both
npm run lint && npm run typecheck
```

---

## 8. Production Deployment

### 8.1 Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

**Build Settings:**
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`

### 8.2 Environment Variables in Production

Add all variables from `.env.local` to your hosting platform.

**Important:** Never commit `.env.local` to version control.

### 8.3 Supabase Production Settings

1. Update **Site URL** to your production domain
2. Add production **Redirect URLs**
3. Enable **Row Level Security** on all tables
4. Review security policies

### 8.4 Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Supabase URL configuration updated
- [ ] First admin user created
- [ ] Initial data seeded
- [ ] Test user registration
- [ ] Test password reset
- [ ] Test chat functionality
- [ ] Test daily teaching generation
- [ ] Verify API key encryption works

---

## 9. Troubleshooting

### Common Issues

#### "Unauthorized" Error on API Calls

**Cause:** Invalid or expired session

**Solution:**
1. Clear browser cookies
2. Log out and log in again
3. Check Supabase Auth settings

#### "No API key configured" Error

**Cause:** Missing environment variable

**Solution:**
1. Verify `.env.local` has all required keys
2. Restart the development server
3. Check key format is correct

#### Embeddings Not Working

**Cause:** OpenAI API key issue or pgvector not enabled

**Solution:**
1. Verify `OPENAI_API_KEY_EMBEDDINGS` is set
2. Enable pgvector extension in Supabase
3. Check OpenAI account has credits

#### Database Connection Errors

**Cause:** Invalid Supabase credentials

**Solution:**
1. Verify Supabase URL and keys
2. Check project is active in Supabase
3. Verify service role key permissions

#### "Module not found" Errors

**Cause:** Incomplete installation

**Solution:**
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### Getting Help

If you encounter issues not covered here:

1. Check the console for error messages
2. Review Supabase logs in dashboard
3. Check API response in Network tab
4. Contact the system administrator

---

## Quick Start Checklist

```
[ ] 1. Clone repository
[ ] 2. Run npm install
[ ] 3. Create Supabase project
[ ] 4. Get Supabase API keys
[ ] 5. Configure Auth redirect URLs
[ ] 6. Enable pgvector extension
[ ] 7. Create .env.local with all variables
[ ] 8. Run database migrations
[ ] 9. Seed initial data
[ ] 10. Get AI provider API keys
[ ] 11. Run npm run dev
[ ] 12. Create first admin user
[ ] 13. Test all features
```

---

*This setup guide is maintained as part of the Sri AB Teachings documentation.*
