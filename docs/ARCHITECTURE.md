# Arquitetura Técnica — Sri AB Teachings SecondBrain

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL (Edge)                         │
│                                                             │
│   Next.js 15 App Router                                     │
│   ┌─────────────┐    ┌──────────────────────────────────┐   │
│   │  Pages/UI   │    │         API Routes               │   │
│   │  React 19   │    │  /api/chat/stream  (SSE)         │   │
│   │  Tailwind   │◄──►│  /api/chat/clone/stream (SSE)    │   │
│   │             │    │  /api/search                     │   │
│   └─────────────┘    │  /api/daily-message/*            │   │
│                      │  /api/admin/*                    │   │
│                      │  /api/system-settings            │   │
│                      └──────────┬───────────────────────┘   │
└─────────────────────────────────┼───────────────────────────┘
                                  │
              ┌───────────────────┼──────────────────────┐
              │                   │                      │
   ┌──────────▼──────────┐ ┌──────▼──────────┐ ┌───────▼──────┐
   │      SUPABASE        │ │   UPSTASH REDIS  │ │  AI PROVIDERS│
   │                      │ │                  │ │              │
   │  PostgreSQL + RLS     │ │  Rate Limiting   │ │  Claude API  │
   │  pgvector (1024-dim)  │ │  Embedding Cache │ │  OpenAI GPT  │
   │  Auth (JWT)           │ │                  │ │  Gemini Pro  │
   │  Storage (avatars)    │ └──────────────────┘ │  Voyage AI   │
   │  28 tables            │                      └──────────────┘
   └──────────────────────┘
```

---

## Camadas do Sistema

### 1. Camada de Apresentação (Frontend)

**Framework:** Next.js 15 App Router com React 19

**Estrutura de páginas:**
```
/                        → Landing / redirect para /app/chat
/login                   → Autenticação
/signup                  → Registro
/reset-password          → Reset de senha
/invite/[token]          → Aceitação de convite

/app/chat                → SecondBrain (chat RAG)
/app/clone               → Clone Cognitivo
/app/explore             → Busca semântica
/app/daily-teaching      → Mensagem Diária
/app/daily-teaching/prompts       → Gerenciar prompts
/app/daily-teaching/settings      → Config de IA
/app/admin/documents              → Gerenciar documentos
/app/admin/members                → Gerenciar membros
/app/admin/audit                  → Logs de auditoria
/app/admin/history                → Histórico de conversas
/app/admin/settings               → Configurações do sistema
```

**Autenticação:** Supabase SSR — cookies HttpOnly gerenciados automaticamente pelo middleware Next.js. O arquivo `middleware.ts` intercepta todas as rotas `/app/*` e `/api/*` para validação.

**Branding dinâmico:** `Sidebar.tsx` busca `/api/system-settings` ao montar e escuta o evento customizado `brandingUpdated` para atualizar nome, subtítulo e avatar sem recarregar a página.

---

### 2. Camada de API (Backend)

Todos os endpoints são **Next.js API Routes** serverless (execução na Vercel).

**Padrão de autenticação:**
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

**Padrão de rate limiting (Upstash):**
```typescript
const { success, limit, remaining, reset } = await chatRateLimiter.limit(user.id)
if (!success) return errorResponse('Rate limit reached', 429)
```

**Wrapper `safeRoute`:** Wrap global de error handling em `src/lib/api-utils.ts` — captura exceções não tratadas e retorna 500 padronizado.

---

### 3. Motor de Busca Semântica

**Arquivo:** `src/lib/semantic-search.ts`

**Fluxo em 3 etapas:**

```
1. Preparação da Query
   ├── enhanceQueryWithFuzzyMatches() — normaliza e gera variações
   ├── getCachedEmbedding() — verifica Redis
   └── generateQueryEmbedding() — Voyage AI (voyage-2, input_type: "query")
       └── setCachedEmbedding() — armazena para futuras queries

2. Busca Vetorial (3-tier fallback)
   ├── search_teachings_optimized RPC (função PLPGSQL otimizada)
   ├── search_teachings RPC (função original — fallback)
   └── fallbackTextSearch() — busca ILIKE + Levenshtein fuzzy

3. Mapeamento de Resultados
   └── SearchResult { id, content, documentId, documentName, sourceName, similarity, metadata }
```

**Função `search_teachings_optimized`:** RPC PostgreSQL que combina cosine distance do pgvector com filtragem por idioma e status do documento. Usa índice IVFFLAT para performance.

---

### 4. Pipeline de Chat (SecondBrain)

**Rota streaming:** `POST /api/chat/stream`

```
1. Auth check + rate limit
2. Input validation (Zod schema)
3. Usage limit check (token_usage vs usage_limits)
4. Get or create conversation (conversations table)
5. Save user message (messages table)
6. Suspicious content check → flagged_content se detectado
7. Audit log (fire-and-forget)
8. Semantic search (threshold 0.65, limit 7, language 'pt')
9. Load conversation history (last 6 messages from DB)
10. Build context string (fontes + conteúdo dos chunks)
11. Stream Claude response (SSE):
    - system: SYSTEM_PROMPT
    - messages: [...history, { role: 'user', content: context + question }]
12. Save assistant message (content + sources + model_used)
```

**Formato SSE:**
```
data: {"type":"token","content":"O "}
data: {"type":"token","content":"ensinamento "}
...
data: {"type":"sources","sources":[...]}
data: {"type":"done"}
```

---

### 5. Pipeline de Chat (Clone Cognitivo)

**Rota streaming:** `POST /api/chat/clone/stream`

Idêntico ao SecondBrain exceto:
- Usa `CLONE_SYSTEM_PROMPT` (DNA Mental completo)
- **Sempre responde** — mesmo sem resultados da busca semântica
- Quando há contexto RAG: enriquece a resposta com os documentos
- Quando não há contexto: responde puramente do DNA Mental
- Fontes são incluídas apenas quando há contexto relevante

---

### 6. Fallback Chain de AI

**Arquivo:** `src/lib/ai-fallback.ts`

```typescript
const FALLBACK_ORDER = ['claude', 'chatgpt', 'gemini']

// Ordem: preferred primeiro, depois fallbacks
for (const provider of order) {
  try {
    const result = await PROVIDER_MAP[provider](params)
    trackTokenUsageWithRetry(...)  // fire-and-forget
    return result
  } catch {
    continue  // próximo provider
  }
}
```

**Suporte a conversationHistory:** Todos os três providers recebem o histórico de mensagens no formato correto de cada API.

---

### 7. Camada de Dados

**Cliente Supabase — três variantes:**
- `createClient()` — cliente do usuário autenticado (usa cookies da sessão)
- `createAdminClient()` — service role key, bypassa RLS (para semantic search)
- `createClient()` (server-side) — para API routes com auth

**Row Level Security:**
- Todos os dados de usuário (`conversations`, `messages`, `feedback`, etc.) filtrados por `user_id`
- `documents` e `document_chunks` visíveis para todos os usuários autenticados
- `system_settings` — SELECT para todos autenticados, UPDATE apenas para admin
- `teaching_sources` — READ para todos, WRITE apenas para admin

**Soft delete:** Documentos têm campo `deleted_at` — a busca semântica filtra automaticamente (`is('documents.deleted_at', null)`).

---

### 8. Rastreamento de Tokens e Limites

**Tabelas:** `token_usage` + `usage_limits`

Cada resposta de IA registra:
- `user_id`, `model`, `provider`
- `input_tokens`, `output_tokens`
- `endpoint` (chat, clone, daily-message, etc.)
- `created_at`

A função `checkUsageLimit()` verifica o total de tokens do mês atual contra os limites definidos por role em `usage_limits`.

---

### 9. Sistema de Configurações Globais

**Tabela:** `system_settings` (key/value)

| Key | Valor padrão | Descrição |
|-----|-------------|-----------|
| `system_name` | `Sri AB Teachings` | Nome exibido no sidebar |
| `system_subtitle` | `Sri Amma Bhagavan` | Subtítulo |
| `avatar_url` | `''` | URL da imagem do avatar |

**Propagação:** Admin salva via `PUT /api/system-settings` → banco → todos os clientes carregam na próxima visita. O evento `brandingUpdated` propaga mudanças imediatas na mesma sessão do browser.

---

### 10. Segurança

- **Rate limiting:** Upstash Redis — 20 requests/hora por usuário
- **Audit logging:** Toda ação de chat registrada em `audit_logs`
- **Suspicious content detection:** `checkSuspiciousContent()` analisa padrões de prompt injection e conteúdo inapropriado
- **Input validation:** Zod schemas em todas as rotas
- **RLS:** PostgreSQL Row Level Security em todas as tabelas
- **Service role:** Usado apenas no servidor para busca semântica (nunca exposto ao cliente)
- **Sentry:** Error tracking com stack traces em produção

---

## Decisões de Arquitetura

### Por que Next.js API Routes em vez de servidor dedicado?
Simplicidade de deploy (Vercel serverless) e co-localização com o frontend. O único trade-off é o cold start ocasional.

### Por que Voyage AI em vez de OpenAI Embeddings?
voyage-2 tem desempenho superior em recuperação semântica para textos espirituais/filosóficos em português. Cache Redis mitiga o custo de latência.

### Por que threshold 0.65 para chat?
Abaixo de 0.65 a qualidade do contexto degradou significativamente em testes — Claude começava a sintetizar respostas com chunks irrelevantes. 0.65 garante que apenas conteúdo genuinamente relacionado entre no contexto.

### Por que histórico limitado a 6 mensagens?
Equilíbrio entre contexto conversacional útil e janela de contexto do Claude. 6 mensagens = 3 pares de perguntas/respostas, o suficiente para manter coerência sem exceder limites de token.

### Por que o Clone usa o mesmo threshold que o SecondBrain?
O DNA Mental do Clone é robusto o suficiente para responder sem contexto. Quando há contexto, queremos que ele seja de alta qualidade. Limiar mais baixo não acrescentaria valor ao Clone.
