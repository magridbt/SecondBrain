# Sri AB Teachings - Technical Documentation

**Version:** 1.0.0
**Last Updated:** 2026-01-21
**Maintainer:** [A definir]

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Module System](#3-module-system)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [AI Providers Configuration](#6-ai-providers-configuration)
7. [API Endpoints](#7-api-endpoints)
8. [Configuration Files](#8-configuration-files)
9. [Adding New Features](#9-adding-new-features)
10. [Deployment](#10-deployment)
11. [Changelog](#11-changelog)

---

## 1. System Overview

### Description
Sri AB Teachings is a multi-module spiritual teaching platform that uses AI to help users explore and understand the teachings of Sri Amma Bhagavan. The system includes:

- **Chat Module**: Semantic search through teachings with AI-powered responses
- **Daily Teaching Module**: Generate daily inspirational messages
- **Admin Panel**: Document management, member management, audit logs

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude, OpenAI, Google Gemini
- **Vector Search**: pgvector (embeddings)
- **Authentication**: Supabase Auth

---

## 2. Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── app/               # Protected app pages
│   │   ├── admin/         # Admin panel pages
│   │   ├── chat/          # Chat module
│   │   └── daily-teaching/ # Daily Teaching module
│   ├── invite/            # User invite acceptance
│   ├── login/             # Login page
│   └── reset-password/    # Password reset
├── components/            # Reusable React components
├── config/                # Configuration files
│   └── ai-models.ts       # AI providers & models config
├── contexts/              # React contexts
├── lib/                   # Utility libraries
│   ├── supabase/          # Supabase clients
│   ├── audit.ts           # Audit logging
│   ├── ratelimit.ts       # Rate limiting
│   └── semantic-search.ts # Vector search
└── types/                 # TypeScript types
```

---

## 3. Module System

### Overview
The system uses a modular architecture where each module has:
- Its own menu items in the sidebar
- Specific user roles (admin, editor, viewer)
- Dedicated pages and functionality

### Available Modules

| Module Slug | Name | Description |
|-------------|------|-------------|
| `sri-ab-teachings` | Sri AB Teachings | Main chat with semantic search |
| `daily-teaching` | Daily Teaching | Generate daily messages |
| `social-media` | Social Media | (Future) Social media integration |

### Database Tables

**`modules`** - Module definitions
```sql
- id: UUID
- name: VARCHAR(100)
- slug: VARCHAR(50) UNIQUE
- description: TEXT
- icon: VARCHAR(50)
- is_active: BOOLEAN
```

**`user_modules`** - User access per module
```sql
- user_id: UUID (FK -> auth.users)
- module_id: UUID (FK -> modules)
- role: VARCHAR(20) -- 'admin', 'editor', 'viewer'
```

### Adding a New Module

1. **Insert into database:**
```sql
INSERT INTO modules (name, slug, description, icon, is_active)
VALUES ('Module Name', 'module-slug', 'Description', 'icon-name', true);
```

2. **Add to Sidebar** (`src/components/Sidebar.tsx`):
```typescript
// In moduleIcons object
const moduleIcons: Record<string, any> = {
  'icon-name': IconComponent,
}

// In getModuleItems() switch
case 'module-slug':
  return [
    { name: 'Page Name', href: '/app/module-slug', icon: Icon, active: ... },
  ]
```

3. **Create pages** in `src/app/app/module-slug/`

---

## 4. Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (name, role, etc.) |
| `conversations` | Chat conversations |
| `messages` | Chat messages |
| `documents` | Uploaded teaching documents |
| `document_chunks` | Chunked documents with embeddings |
| `teaching_sources` | Document categories |
| `invites` | User invitations |
| `audit_logs` | Activity logs |
| `flagged_content` | Flagged suspicious content |
| `user_ai_settings` | Per-user AI configuration |
| `modules` | Available modules |
| `user_modules` | User access to modules |
| `custom_prompts` | Daily teaching prompts |

### Key Relationships

```
profiles (1) -----> (*) conversations -----> (*) messages
profiles (1) -----> (*) user_modules -----> (1) modules
documents (1) -----> (*) document_chunks
teaching_sources (1) -----> (*) documents
```

---

## 5. Authentication & Authorization

### User Roles (System-wide)
- **admin**: Full access to all modules and admin panel
- **member**: Access based on module permissions

### Module Roles
- **admin**: Full access within the module
- **editor**: Can create/edit content
- **viewer**: Read-only access

### Role Check Logic
```typescript
// In components
const isSystemAdmin = profile?.role === 'admin'
const isModuleAdmin = selectedModule?.user_role === 'admin' || isSystemAdmin
```

### Protected Routes
All `/app/*` routes are protected by the middleware and layout authentication check.

---

## 6. AI Providers Configuration

### Configuration File
**Location:** `src/config/ai-models.ts`

### Structure
```typescript
export interface AIModel {
  id: string          // Model identifier for API calls
  name: string        // Display name
  description: string // Short description
  isDefault?: boolean // Mark as recommended
  isNew?: boolean     // Show "New" badge
  isDeprecated?: boolean // Show deprecation warning
}

export interface AIProvider {
  id: 'claude' | 'chatgpt' | 'gemini'
  name: string        // Short name
  fullName: string    // Full name with company
  keyPrefix: string   // API key prefix for validation
  keyUrl: string      // URL to get API key
  models: AIModel[]   // Available models
}
```

### Adding New Models

**Step 1:** Edit `src/config/ai-models.ts`
```typescript
// Find the provider and add to models array
{
  id: 'claude',
  name: 'Claude',
  models: [
    // Add new model here
    {
      id: 'claude-5-20270101',
      name: 'Claude 5',
      description: 'Next generation model',
      isNew: true,
    },
    // ... existing models
  ],
}
```

**Step 2:** That's it! The UI automatically updates.

### Adding New AI Provider

**Step 1:** Add provider to `AI_PROVIDERS` array in `src/config/ai-models.ts`

**Step 2:** Add styling config in `src/app/app/daily-teaching/settings/page.tsx`:
```typescript
const PROVIDER_CONFIG = {
  newprovider: {
    icon: IconComponent,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    keyField: 'newprovider_api_key',
    modelField: 'newprovider_model',
  },
}
```

**Step 3:** Add database column:
```sql
ALTER TABLE user_ai_settings
ADD COLUMN newprovider_api_key TEXT,
ADD COLUMN newprovider_model VARCHAR(50) DEFAULT 'default-model';
```

**Step 4:** Update the generate API endpoint to handle the new provider.

---

## 7. API Endpoints

### Authentication Required
All `/api/*` endpoints require authentication via Supabase session.

### Chat Module

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message and get AI response |
| GET | `/api/conversations` | List user conversations |
| GET | `/api/conversations/[id]` | Get conversation messages |
| DELETE | `/api/conversations/[id]` | Delete conversation |

### Daily Teaching Module

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/daily-message/search` | Search teachings |
| POST | `/api/daily-message/generate` | Generate daily message |
| GET | `/api/prompts` | List custom prompts |
| POST | `/api/prompts` | Create prompt |
| PUT | `/api/prompts` | Update prompt |
| DELETE | `/api/prompts?id=` | Delete prompt |
| POST | `/api/daily-teaching/test-api` | Test API key |

### Admin Module

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/documents` | List documents |
| POST | `/api/admin/documents` | Upload document |
| DELETE | `/api/admin/documents?id=` | Delete document |
| GET | `/api/admin/documents/preview?id=` | Get document preview URL |
| GET | `/api/admin/documents/content?id=` | Get text document content |
| POST | `/api/admin/documents/text` | Insert text document |
| POST | `/api/admin/documents/reprocess` | Reprocess documents |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai-settings` | Get user AI settings |
| POST | `/api/ai-settings` | Save AI settings |
| DELETE | `/api/ai-settings?key=` | Remove API key |

---

## 8. Configuration Files

### Environment Variables (`.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# AI APIs (fallback if user doesn't have their own)
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=AIzaxxx

# OpenAI for embeddings
OPENAI_API_KEY_EMBEDDINGS=sk-xxx

# Security
ENCRYPTION_KEY=xxx
```

### Tailwind Configuration
Custom gold color palette is defined in `tailwind.config.ts`.

---

## 9. Adding New Features

### Creating a New Admin Page

1. Create page at `src/app/app/admin/[page-name]/page.tsx`
2. Add to `adminItems` array in `src/components/Sidebar.tsx`
3. Import icon from `lucide-react`

### Creating API Endpoint

1. Create file at `src/app/api/[endpoint]/route.ts`
2. Export HTTP methods: `GET`, `POST`, `PUT`, `DELETE`
3. Always check authentication:
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Database Migrations

1. Create file in `supabase/migrations/[timestamp]_[description].sql`
2. Apply with Supabase CLI or directly in dashboard

---

## 10. Deployment

### Prerequisites
- Node.js 18+
- Supabase project
- AI API keys

### Build
```bash
npm run build
```

### Environment Setup
Copy `.env.example` to `.env.local` and configure all variables.

### Supabase Setup
1. Create project at supabase.com
2. Run all migrations from `supabase/migrations/`
3. Configure Auth settings (redirect URLs)

---

## 11. Changelog

### 2026-01-21
- Added multi-provider AI settings (Claude, ChatGPT, Gemini)
- Created centralized AI models config (`src/config/ai-models.ts`)
- Added History page to view user conversations
- Fixed YouTube link display in documents
- Improved audit logs to show user queries
- Implemented module-based access control system
- Added forgot password functionality
- Created Daily Teaching module with custom prompts

### 2026-01-19
- Initial system setup
- Chat module with semantic search
- Document management
- User authentication

---

## Documentation Maintenance

**Responsibility:** This documentation should be updated whenever:
- New features are added
- Database schema changes
- API endpoints are modified
- Configuration changes

**Recommended Practice:**
- Update this file in the same PR/commit as the code change
- Include date in changelog
- Keep examples up to date

---

*This documentation is maintained as part of the Sri AB Teachings project.*
