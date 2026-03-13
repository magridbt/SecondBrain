# Changelog

All notable changes to the Sri AB Teachings project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.5.0] - 2026-03-13

### Fixed — Calibração de Thresholds de Busca Semântica
- **Chat / Clone:** threshold corrigido de `0.35` → `0.65` em todas as rotas de chat
  - `api/chat/stream/route.ts`
  - `api/chat/clone/stream/route.ts`
  - `api/chat/route.ts` (non-streaming)
  - Limite ajustado de 5 → 7 chunks por consulta
- **Daily Teaching:** threshold `0.35` → `0.55` em `api/daily-message/search/route.ts`
- **Explorar/Browse:** threshold `0.35` → `0.50` em `api/search/route.ts` (campo `minSimilarity` também atualizado)
- **Racional:** threshold 0.35 trazia chunks irrelevantes ao contexto do Claude, degradando qualidade das respostas

### Added — Histórico de Conversa no Context Window
- Chat SecondBrain e Clone Cognitivo agora incluem as últimas **6 mensagens** (3 pares) no contexto enviado ao Claude
- Implementado em `api/chat/stream`, `api/chat/clone/stream` e `api/chat` (non-streaming)
- Rota não-streaming usa `.neq('id', userMessage?.id)` para excluir a mensagem atual já salva antes da chamada de IA
- `ai-fallback.ts` atualizado com interface `ConversationTurn` e suporte a `conversationHistory` nos três providers (Claude, ChatGPT, Gemini)

### Added — Branding Persistente via Banco de Dados
- Nova tabela `system_settings` (migration `005_system_settings.sql`)
- Novo endpoint `GET/PUT /api/system-settings`
- Admin pode alterar nome do sistema, subtítulo e avatar — configurações persistem para **todos** os usuários
- `Sidebar.tsx` e `admin/settings/page.tsx` atualizados para ler/escrever no banco (localStorage permanece apenas como cache local)

### Added — Clone Cognitivo com Disclaimer de Transparência
- Badge discreto "DNA Mental • IA" (ponto roxo pulsante) no header do Clone Cognitivo
- Tooltip: "Respostas geradas por IA com base no DNA dos ensinamentos de Sri Amma Bhagavan"
- Footer atualizado: "Baseado no DNA dos ensinamentos de Sri Amma Bhagavan • Respostas geradas por IA"

### Added — Documentação Completa do Projeto
- `README.md` reescrito com visão geral completa, stack, módulos, pipeline RAG e thresholds
- `docs/ARCHITECTURE.md` — arquitetura técnica detalhada com diagramas ASCII
- `docs/API.md` — referência completa de todos os endpoints
- `docs/ADMIN_GUIDE.md` — guia do administrador (documentos, membros, branding, troubleshooting)
- `docs/DEVELOPMENT.md` — setup de desenvolvimento e padrões de código
- `docs/DEPLOYMENT.md` — checklist de deploy, Vercel + Supabase + Upstash

---

## [1.2.0] - 2026-01-21

### Added - Multi-Provider AI Support
- **AI Settings Page** (`/app/daily-teaching/settings`)
  - Support for multiple AI providers (Claude, ChatGPT, Gemini)
  - API key management with secure storage
  - Model selection per provider
  - Temperature and max tokens configuration
  - API key testing functionality

- **Centralized AI Models Configuration**
  - New config file: `src/config/ai-models.ts`
  - Easy maintenance when new models are released
  - Support for `isNew`, `isDefault`, `isDeprecated` badges
  - Helper functions: `getProvider()`, `getDefaultModel()`, `getModelName()`

- **API Endpoint for Testing API Keys**
  - `POST /api/daily-teaching/test-api` - Validates API keys against providers

### Changed
- Sidebar now shows "AI Settings" option for Daily Teaching module
- AI models are now loaded from centralized config instead of hardcoded values

---

## [1.1.0] - 2026-01-21

### Added - Admin Enhancements

#### History Page
- **New Admin Page** (`/app/admin/history`)
  - View all user conversations
  - Expandable conversation cards showing full message history
  - User and Assistant messages with timestamps
  - Search by user name, email, or message content
  - Refresh functionality

#### Audit Logs Improvements
- Query/Details column now shows actual user search queries
- Renamed "Details" column to "Query / Details" for clarity
- Shows `messagePreview` from audit logs

#### Document Management
- **YouTube Link Display**: Documents with YouTube URLs now show clickable "YouTube" link in File column
- **Text Content Preview Modal**: Clicking File on text documents opens modal with content instead of new tab
- New API endpoint: `GET /api/admin/documents/content` - Returns text content of documents

### Changed
- File column logic updated to prioritize YouTube links when available
- `handlePreview` function now handles text documents differently (modal vs new tab)

---

## [1.0.0] - 2026-01-19

### Added - Module System

#### Multi-Module Architecture
- **Database Tables**
  - `modules` - Module definitions (name, slug, icon, description)
  - `user_modules` - User access per module with roles (admin, editor, viewer)

- **Sidebar Module Selector**
  - Dropdown to switch between modules
  - Dynamic menu based on selected module
  - Admin menu only visible for module admins

- **Module Access in Invites**
  - Invite members with specific module access
  - Role selection per module (admin, editor, viewer)
  - Module access applied on invite acceptance

#### Authentication Improvements
- **Forgot Password Feature**
  - "Esqueci minha senha" option on login page
  - Password reset email via Supabase Auth
  - `/reset-password` page for setting new password
  - Supabase auth redirect URL configuration

### Changed
- Members page updated to include module access management
- Invite page applies module access when user accepts
- Login page now has 3 modes: login, signup, forgot password

---

## [0.9.0] - 2026-01-18

### Added - Daily Teaching Module

#### Core Features
- **Daily Teaching Page** (`/app/daily-teaching`)
  - Topic-based teaching search
  - AI-powered message generation
  - Language selection (PT, EN, ES)
  - Provider selection (Claude, ChatGPT, Gemini)

- **Custom Prompts** (`/app/daily-teaching/prompts`)
  - Create, edit, delete custom prompts
  - Set prompts as default
  - Use prompts for message generation

#### Database
- `custom_prompts` table for storing user prompts
- `user_ai_settings` table for AI configuration

#### API Endpoints
- `POST /api/daily-message/search` - Search teachings by topic
- `POST /api/daily-message/generate` - Generate daily message
- `GET/POST/PUT/DELETE /api/prompts` - Prompt CRUD operations

---

## [0.8.0] - 2026-01-15

### Added - Chat Module Enhancements

#### Semantic Search
- Vector embeddings using OpenAI text-embedding-3-small
- pgvector extension for similarity search
- Language-aware search (filters by detected language)
- Theme-based filtering

#### Chat Features
- Conversation history
- Source citations in responses
- YouTube URL display for video sources
- Multi-language support (auto-detection)

---

## [0.7.0] - 2026-01-12

### Added - Document Management

#### Upload Features
- PDF, Word, TXT file upload
- Text insertion mode (paste content directly)
- Metadata fields per source type:
  - 81000 Program: Year, Date, Language
  - Kalki Dharma / Great Compassionate Light: YouTube URL, Publish Date, Language
  - Sri AB Original / Tejasaji: Origin, Date, Language

#### Processing
- Automatic text extraction
- Document chunking for embeddings
- Status tracking (pending, processing, processed, error)
- Reprocess functionality

---

## [0.6.0] - 2026-01-10

### Added - Admin Panel

#### Pages
- **Documents** (`/app/admin/documents`) - Document management
- **Members** (`/app/admin/members`) - User management
- **Audit & Logs** (`/app/admin/audit`) - Activity monitoring
- **Settings** (`/app/admin/settings`) - System configuration

#### Features
- User invitation system
- Role management (admin, member)
- Audit logging for user actions
- Flagged content detection

---

## [0.5.0] - 2026-01-08

### Added - Core Chat Functionality

- Basic chat interface
- Claude AI integration
- Conversation persistence
- Rate limiting

---

## [0.4.0] - 2026-01-05

### Added - Authentication

- Supabase Auth integration
- Login/Signup pages
- Protected routes
- Session management

---

## [0.3.0] - 2026-01-03

### Added - UI Foundation

- Tailwind CSS with custom gold palette
- Dark/Light theme support
- Responsive sidebar layout
- Loading states and animations

---

## [0.2.0] - 2026-01-02

### Added - Database Setup

- Supabase project configuration
- Core tables (profiles, conversations, messages, documents)
- Row Level Security policies
- Database triggers for profile creation

---

## [0.1.0] - 2026-01-01

### Added - Project Initialization

- Next.js 14 with App Router
- TypeScript configuration
- ESLint and Prettier setup
- Initial project structure

---

## Migration Notes

### Upgrading to 1.2.0
1. Run database migration for `user_ai_settings` table if not exists
2. Users can now configure their own AI providers in Daily Teaching > AI Settings

### Upgrading to 1.1.0
1. No database changes required
2. New admin pages automatically available

### Upgrading to 1.0.0
1. Run migrations for `modules` and `user_modules` tables
2. Seed initial modules data
3. Assign module access to existing users

---

## Contributors

- **Development**: Claude Code (AI Assistant)
- **Project Owner**: Magrid BT
- **Documentation**: @architect (Aria) - AIOS Framework

---

*This changelog is maintained as part of the Sri AB Teachings documentation.*
