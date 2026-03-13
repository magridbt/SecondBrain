# Guia de Desenvolvimento — Sri AB Teachings SecondBrain

---

## Pré-requisitos

- Node.js 18+
- npm
- Conta Supabase (projeto configurado)
- Chaves de API: Anthropic, Voyage AI, Upstash Redis

---

## Setup Inicial

### 1. Clonar e instalar dependências

```bash
cd "Sri Amma Bhagavan"
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# IA (Anthropic é obrigatório, resto é fallback opcional)
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key       # opcional (fallback)
GOOGLE_AI_API_KEY=your_google_ai_api_key # opcional (fallback)
VOYAGE_API_KEY=your_voyage_api_key        # OBRIGATÓRIO (embeddings)

# Upstash Redis (rate limiting + cache)
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
# UPSTASH_REDIS_REST_TOKEN → ver .env.local

# Sentry (opcional)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

### 3. Configurar banco de dados

Execute os migrations no Supabase Dashboard → SQL Editor:

```bash
# Ordem de execução:
migrations/001_initial_schema.sql   # Tabelas base
migrations/002_...sql               # Extensões
migrations/003_...sql               # ...
migrations/004_...sql               # ...
migrations/005_system_settings.sql  # system_settings (v1.5)
```

Funções RPC necessárias (PostgreSQL):
- `search_teachings` — busca vetorial original
- `search_teachings_optimized` — busca vetorial otimizada com IVFFLAT index

### 4. Iniciar desenvolvimento

```bash
npm run dev
# → http://localhost:3000
```

---

## Estrutura de Arquivos Principais

```
src/
├── app/
│   ├── api/                         # API Routes
│   │   ├── chat/
│   │   │   ├── stream/route.ts      # Chat SecondBrain (SSE)
│   │   │   ├── clone/stream/route.ts # Chat Clone (SSE)
│   │   │   └── route.ts             # Chat non-streaming
│   │   ├── search/route.ts          # Busca semântica
│   │   ├── daily-message/           # Daily Teaching
│   │   ├── admin/                   # Admin endpoints
│   │   └── system-settings/route.ts # Branding
│   └── app/                         # Páginas
│       ├── chat/page.tsx
│       ├── clone/page.tsx
│       ├── explore/page.tsx
│       └── admin/
├── components/
│   ├── Sidebar.tsx                  # Navegação + branding
│   └── ...
└── lib/
    ├── semantic-search.ts           # Motor RAG principal
    ├── ai-fallback.ts              # Orquestrador multi-AI
    ├── constants/prompts.ts         # SYSTEM_PROMPT + CLONE_SYSTEM_PROMPT
    ├── ratelimit.ts                 # Rate limiting Upstash
    ├── token-tracking.ts            # Rastreamento de tokens
    ├── audit.ts                     # Auditoria
    ├── embedding-cache.ts           # Cache Redis
    ├── fuzzy-search.ts             # Busca fuzzy
    ├── api-utils.ts                 # Helpers (safeRoute, schemas, etc.)
    └── supabase/
        ├── server.ts               # createClient() + createAdminClient()
        └── client.ts               # Browser client
```

---

## Fluxo de Desenvolvimento

### Adicionando um novo endpoint

1. Criar `src/app/api/[path]/route.ts`
2. Usar o padrão `safeRoute`:

```typescript
import { withAuth, errorResponse, successResponse, safeRoute } from '@/lib/api-utils'

export const POST = safeRoute(async (request: Request) => {
  const authResult = await withAuth(request)
  if (authResult instanceof Response) return authResult
  const { user } = authResult

  // ... lógica do endpoint

  return successResponse({ data: 'valor' })
})
```

### Adicionando uma nova página

1. Criar `src/app/app/[modulo]/page.tsx`
2. O layout em `src/app/app/layout.tsx` já provê Sidebar e proteção de rota

### Modificando prompts de IA

Os prompts são centralizados em `src/lib/constants/prompts.ts`:
- `SYSTEM_PROMPT` — SecondBrain (RAG estrito)
- `CLONE_SYSTEM_PROMPT` — Clone Cognitivo (DNA Mental)
- `NO_RESULTS_ANSWER` — Resposta quando não há contexto

### Ajustando thresholds de busca

Os thresholds são definidos em cada rota de API:

| Arquivo | Threshold | Limit |
|---------|-----------|-------|
| `api/chat/stream/route.ts` | 0.65 | 7 |
| `api/chat/clone/stream/route.ts` | 0.65 | 7 |
| `api/chat/route.ts` | 0.65 | 7 |
| `api/daily-message/search/route.ts` | 0.55 | 20 |
| `api/search/route.ts` | 0.50 | 12 |

---

## Testes

```bash
npm run test              # Rodar todos os testes
npm run test:watch        # Watch mode
npm run test:coverage     # Com relatório de cobertura
```

**Nota:** Os testes em `__tests__/` usam Vitest mas o projeto está configurado com Jest. Testes unitários para novas funcionalidades devem ser escritos com Jest (`test/` ou `*.test.ts`).

---

## Debugging

### Logs de busca semântica

A função `semanticSearch` emite logs detalhados no console do servidor:
```
Query analysis: { original, normalized, variations: N }
📦 Embedding cache HIT (ou miss)
🔍 Semantic Search (OPTIMIZED): "query" - Threshold: 65%
✅ OPTIMIZED SEARCH: Found N results
```

### Inspecionar resposta do Claude

No modo não-streaming (`/api/chat`), o `traceId` é retornado na resposta e gravado nos audit logs para rastreabilidade.

### Verificar cache de embeddings

No Upstash Dashboard → Redis Browser, as chaves seguem o padrão:
```
embedding:{hash_da_query_normalizada}
```

---

## TypeScript

```bash
npm run lint          # ESLint
npx tsc --noEmit     # Type check sem build
npm run build         # Build completo (inclui type check)
```

**Nota importante:** Os arquivos em `__tests__/` têm erros `TS2307 Cannot find module 'vitest'` pré-existentes. São ignorados durante o build normal.

---

## Processamento de Documentos

### Fluxo de indexação manual (via API)

```bash
# Upload de documento
curl -X POST http://localhost:3000/api/admin/documents \
  -H "Cookie: [sessão]" \
  -F "file=@documento.pdf" \
  -F "sourceId=uuid-da-fonte" \
  -F 'metadata={"language":"pt","darshan_date":"2024-01-15"}'
```

### Tipos de arquivo suportados
- **PDF** — via `unpdf`
- **DOCX** — via `mammoth`
- **TXT** — leitura direta

### Metadados por tipo de fonte

```typescript
// 81000 Program
{ program_year: "ano_1_2024", darshan_date: "2024-01-15", language: "pt" }

// Kalki Dharma / Great Compassionate Light
{ youtube_url: "https://youtube.com/...", publish_date: "2024-01-15", language: "pt" }

// Sri AB Original / Tejasaji
{ origin: "darshan", date: "2024-01-15", language: "pt" }
```

---

## Padrões de Código

### Error handling em API routes
```typescript
// Usar safeRoute para catch global
export const POST = safeRoute(async (request) => {
  // throw qualquer Error — safeRoute converte para 500
})
```

### Acesso ao Supabase
```typescript
// Na API (server-side, usa sessão do usuário)
const supabase = await createClient()

// Para busca semântica (bypassa RLS com service role)
const adminClient = createAdminClient()
```

### Streaming SSE
```typescript
const encoder = new TextEncoder()
const stream = new ReadableStream({
  async start(controller) {
    const send = (data: object) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
    }
    send({ type: 'token', content: '...' })
    controller.close()
  }
})
return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
})
```
