# Sri AB Teachings — SecondBrain

**SecondBrain dos Ensinamentos de Sri Amma Bhagavan**

Plataforma RAG (Retrieval-Augmented Generation) completa para busca, consulta e geração de conteúdo baseado nos ensinamentos de Sri Amma Bhagavan. Construída com Next.js 15, Supabase, Voyage AI e Claude API.

---

## Visão Geral

O sistema oferece sete módulos de interação com os ensinamentos:

| Módulo | Rota | Descrição |
|--------|------|-----------|
| **SecondBrain** | `/app/chat` | Chat RAG estrito — responde APENAS com base nos documentos indexados |
| **Clone Cognitivo** | `/app/clone` | Chat com DNA Mental — responde como Sri Amma Bhagavan mesmo sem documentos |
| **Explorar** | `/app/explore` | Busca semântica pura — retorna chunks mais relevantes sem geração de IA |
| **Mensagem Diária** | `/app/daily-teaching` | Gera mensagens temáticas para divulgação baseadas nos ensinamentos |
| **Cursos** | `/app/cursos` | Produção de conteúdo para cursos (Dádiva de Ananda, 81000 Deeksha Yajna, etc.) |
| **Redes Sociais** | `/app/social-media` | Geração de conteúdo para 8 redes (YouTube, Instagram, TikTok, etc.) |
| **Milagres** | `/app/milagres` | Geração de textos inspiracionais baseados nos ensinamentos |

Ver [docs/MODULES.md](docs/MODULES.md) para descrição detalhada de cada módulo.

---

## Stack Tecnológico

### Frontend
- **Next.js 15** (App Router) + **React 19**
- **TypeScript 5.7**
- **Tailwind CSS 3** — tema ouro/escuro personalizado
- **Lucide React** — ícones

### Backend
- **Next.js API Routes** — serverless functions (Vercel)
- **Supabase** — Auth, PostgreSQL + pgvector, Storage, Realtime
- **Upstash Redis** — rate limiting + cache de embeddings

### IA & Embeddings
- **Voyage AI (voyage-2)** — geração de embeddings (1024 dimensões)
- **Claude claude-sonnet-4-20250514** (Anthropic) — LLM primário
- **GPT-4o** (OpenAI) — fallback
- **Gemini 1.5 Pro** (Google) — fallback secundário

### Infraestrutura
- **Vercel** — deploy (Next.js + API routes)
- **Supabase** — banco de dados hospedado (us-east-1)
- **Sentry** — monitoramento de erros

---

## Módulos do Sistema

### 1. SecondBrain (Chat RAG)
- Threshold de similaridade: **0.65**
- Recupera até **7 chunks** por consulta
- Histórico de conversa: últimas **6 mensagens** passadas ao Claude
- Recusa responder quando não há contexto relevante nos documentos
- Cita fontes automaticamente com data e link YouTube quando disponível
- Streaming SSE via `POST /api/chat/stream`

### 2. Clone Cognitivo
- Mesmo threshold e limite do SecondBrain (0.65 / 7 chunks)
- Sempre responde — com ou sem documentos de contexto RAG
- Guiado pelo `CLONE_SYSTEM_PROMPT` com:
  - 10 marcadores de voz (Calor com Clareza, Rigor Intelectual, etc.)
  - 6 padrões cognitivos (Problema → Análise de Consciência, etc.)
  - 7 assinaturas comportamentais
  - 15 marcadores linguísticos
- Badge "DNA Mental • IA" para transparência
- Streaming SSE via `POST /api/chat/clone/stream`

### 3. Explorar (Busca Semântica)
- Threshold: **0.50** — mais amplo para descoberta
- Recupera até **12 resultados** por consulta
- Deduplica por documento (mantém melhor chunk por documento)
- Exibe % de similaridade, fonte e metadados
- Via `POST /api/search`

### 4. Mensagem Diária
- Busca por tema com threshold **0.55**, até **20 resultados**
- Geração com suporte a PT, EN, ES
- Prompts customizáveis por usuário
- Fallback automático de providers: Claude → ChatGPT → Gemini
- Via `POST /api/daily-message/generate`

---

## Banco de Dados

28 tabelas no PostgreSQL (Supabase) com RLS:

```
audit_logs               Log de ações de usuários
conversations            Sessões de chat
custom_prompts           Prompts personalizados (Daily Teaching)
daily_messages           Mensagens diárias geradas
document_chunks          Chunks com embeddings (pgvector 1024-dim)
document_themes          Relação documento-tema
documents                Documentos indexados
embedding_cache          Cache de embeddings (backup Redis)
feedback                 Feedback de respostas do chat
flagged_content          Conteúdo suspeito sinalizado
invites                  Convites de membros
message_feedback         Avaliação de mensagens
message_fidelity_feedback Avaliação de fidelidade ao ensinamento
messages                 Mensagens de conversas
miracle_copies           Cópias de miracles geradas
miracle_prompts          Prompts para módulo Miracles
miracles                 Módulo Miracles
modules                  Definições de módulos do sistema
profiles                 Perfis de usuários
response_cache           Cache de respostas
system_settings          Configurações globais (nome, avatar, etc.)
teaching_sources         Fontes de ensinamentos (81000 Program, etc.)
themes                   Temas/categorias semânticas
token_usage              Rastreamento de uso de tokens por usuário
usage_limits             Limites de uso por role
user_ai_settings         Config de IA por usuário (Daily Teaching)
user_modules             Acesso de usuários por módulo e role
user_sessions            Sessões ativas
```

---

## Pipeline RAG

```
Query → Fuzzy Enhance → Voyage AI Embed → pgvector Search → Claude → SSE Stream
          (normalize)    (cache Redis)    (3-tier fallback)  (w/ history)
```

**Thresholds por contexto:**

| Contexto | Threshold | Limite | Racional |
|----------|-----------|--------|----------|
| Chat / Clone | 0.65 | 7 chunks | Alta precisão — evita contexto irrelevante |
| Mensagem Diária | 0.55 | 20 chunks | Relevância temática mais ampla |
| Explorar / Browse | 0.50 | 12 chunks | Descoberta — mais amplo |
| Classifier de Tema | 0.35 | — | Classificação aproximada |

---

## Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# IA
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
VOYAGE_API_KEY=your_voyage_api_key

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
# UPSTASH_REDIS_REST_TOKEN → ver .env.local

# Sentry (opcional)
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

## Quick Start

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas chaves

# Iniciar desenvolvimento
npm run dev
# → http://localhost:3000
```

---

## Scripts

```bash
npm run dev          # Servidor de desenvolvimento (porta 3000)
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # ESLint
npm run test         # Jest (testes unitários)
npm run test:watch   # Jest em modo watch
npm run test:coverage # Jest com relatório de cobertura
```

---

## Versão Atual

**v1.5.0** — Março 2026

Melhorias: thresholds calibrados, histórico de conversa, branding persistente, Clone Cognitivo com disclaimer.

Ver [docs/CHANGELOG.md](docs/CHANGELOG.md) para histórico completo.

---

## Documentação

- [docs/MODULES.md](docs/MODULES.md) — Descrição detalhada de todos os módulos
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Arquitetura técnica completa
- [docs/API.md](docs/API.md) — Referência de todos os endpoints
- [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) — Guia do administrador
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — Setup de desenvolvimento
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Deploy em produção
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — Histórico de versões

---

*Uso privado — Magrid BT. Todos os ensinamentos são propriedade de Sri Amma Bhagavan.*
