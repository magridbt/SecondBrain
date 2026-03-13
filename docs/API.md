# Referência de API — Sri AB Teachings SecondBrain

Todos os endpoints requerem autenticação (cookie de sessão Supabase) exceto onde indicado.

---

## Chat

### POST /api/chat/stream
Chat SecondBrain com streaming SSE.

**Body:**
```json
{
  "message": "O que Sri Amma Bhagavan ensina sobre o ego?",
  "conversationId": "uuid" // opcional — cria nova conversa se omitido
}
```

**Response:** `text/event-stream`
```
data: {"type":"conversationId","conversationId":"uuid"}
data: {"type":"token","content":"O "}
data: {"type":"token","content":"ego "}
...
data: {"type":"sources","sources":[{"documentName":"...","sourceName":"...","similarity":0.78,"date":"Janeiro 2024","metadata":{}}]}
data: {"type":"done"}
```

**Erros possíveis:**
- `401` — Não autenticado
- `429` — Rate limit atingido
- `400` — Input inválido (message muito curta/longa)

---

### POST /api/chat/clone/stream
Chat Clone Cognitivo com streaming SSE. Mesma interface do `/api/chat/stream`.

**Diferença:** Responde mesmo sem contexto RAG, usando o DNA Mental do CLONE_SYSTEM_PROMPT.

---

### POST /api/chat (non-streaming)
Versão não-streaming do SecondBrain com fallback multi-provider.

**Body:** mesmo do `/api/chat/stream`

**Response:**
```json
{
  "answer": "...",
  "sources": [...],
  "conversationId": "uuid",
  "traceId": "uuid"
}
```

---

## Busca

### POST /api/search
Busca semântica pura — sem processamento por IA.

**Body:**
```json
{ "query": "graça divina" }
```

**Response:**
```json
{
  "query": "graça divina",
  "searchQuery": "graça divina",
  "totalResults": 8,
  "results": [
    {
      "rank": 1,
      "id": "chunk-uuid",
      "documentId": "doc-uuid",
      "documentName": "Darshan Janeiro 2024",
      "sourceName": "81000 Program",
      "content": "...",
      "similarity": 0.82,
      "similarityPercent": 82,
      "metadata": { "darshan_date": "2024-01-15", "language": "pt" },
      "date": "15/01/2024"
    }
  ],
  "mode": "semantic_search",
  "minSimilarity": "50%"
}
```

---

## Mensagem Diária

### POST /api/daily-message/search
Busca ensinamentos por tema para geração de mensagem diária.

**Body:**
```json
{
  "topic": "impotência e graça",
  "limit": 10
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "chunk-uuid",
      "content": "...",
      "documentId": "doc-uuid",
      "documentName": "...",
      "sourceName": "...",
      "similarity": 0.67,
      "language": "pt"
    }
  ]
}
```

---

### POST /api/daily-message/generate
Gera mensagem diária baseada em tema + ensinamentos encontrados.

**Body:**
```json
{
  "topic": "despertar",
  "language": "pt",
  "provider": "claude",
  "promptId": "uuid" // opcional — usa prompt customizado
}
```

**Response:** `text/event-stream` (streaming SSE)
```
data: {"type":"token","content":"Querido "}
...
data: {"type":"done"}
```

---

### POST /api/daily-message/generate/stream
Alias streaming para geração de mensagem diária. Mesmo comportamento do anterior.

---

### GET /api/daily-message
Lista mensagens diárias geradas pelo usuário.

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "topic": "despertar",
      "content": "...",
      "language": "pt",
      "created_at": "2026-03-13T..."
    }
  ]
}
```

---

## Prompts

### GET /api/prompts
Lista prompts customizados do usuário.

### POST /api/prompts
Cria novo prompt.

**Body:**
```json
{
  "name": "Mensagem de Bênção",
  "content": "Crie uma mensagem espiritual...",
  "isDefault": false
}
```

### PUT /api/prompts
Atualiza prompt existente.

### DELETE /api/prompts?id=uuid
Remove prompt.

---

## Conversas

### GET /api/conversations
Lista conversas do usuário.

**Response:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "module": "sri_ab_teachings",
      "created_at": "...",
      "updated_at": "...",
      "messageCount": 12
    }
  ]
}
```

### GET /api/conversations/[id]
Retorna conversa com todas as mensagens.

### DELETE /api/conversations/[id]
Remove conversa e suas mensagens.

---

## Feedback

### POST /api/feedback
Feedback geral de uma resposta.

**Body:**
```json
{
  "messageId": "uuid",
  "rating": "positive",
  "comment": "..."
}
```

### POST /api/feedback/fidelity
Avaliação de fidelidade ao ensinamento.

**Body:**
```json
{
  "messageId": "uuid",
  "fidelityScore": 5,
  "notes": "..."
}
```

---

## Configurações de IA

### GET /api/ai-settings
Retorna configurações de IA do usuário.

### PUT /api/ai-settings
Atualiza configurações de IA.

**Body:**
```json
{
  "provider": "claude",
  "model": "claude-sonnet-4-20250514",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

---

## Configurações do Sistema

### GET /api/system-settings
Retorna configurações globais do sistema (branding).

**Response:**
```json
{
  "settings": {
    "system_name": "Sri AB Teachings",
    "system_subtitle": "Sri Amma Bhagavan",
    "avatar_url": "https://..."
  }
}
```

*Nota: Endpoint público (não requer auth de admin para leitura)*

### PUT /api/system-settings
Atualiza configurações globais. **Requer role admin.**

**Body (qualquer combinação de):**
```json
{
  "system_name": "Novo Nome",
  "system_subtitle": "Novo Subtítulo",
  "avatar_url": "https://..."
}
```

---

## Admin

### GET /api/admin/documents
Lista todos os documentos (admin only).

**Query params:**
- `sourceId` — filtrar por fonte
- `status` — `pending | processing | indexed | error`
- `page`, `limit`

### POST /api/admin/documents
Upload de novo documento.

**Form data:**
- `file` — PDF, DOCX ou TXT
- `sourceId` — UUID da fonte
- `metadata` — JSON com campos opcionais (darshan_date, language, youtube_url, etc.)

### DELETE /api/admin/documents/[id]
Soft-delete de documento (marca `deleted_at`).

### POST /api/admin/documents/reprocess
Reprocessa documento (reextrair texto e gerar embeddings).

**Body:** `{ "documentId": "uuid" }`

### GET /api/admin/documents/content?documentId=uuid
Retorna conteúdo textual de um documento.

### GET /api/admin/documents/preview?documentId=uuid
Preview de documento PDF (URL de storage).

---

### GET /api/admin/invites
Lista convites pendentes.

### POST /api/admin/invites
Cria novo convite.

**Body:**
```json
{
  "email": "usuario@email.com",
  "role": "member",
  "moduleId": "uuid",
  "moduleRole": "viewer"
}
```

---

### PUT /api/admin/members/[id]/permissions
Atualiza permissões de um membro.

**Body:**
```json
{
  "role": "admin",
  "moduleAccess": [
    { "moduleId": "uuid", "role": "editor" }
  ]
}
```

---

### POST /api/admin/generate-theme-embeddings
Gera embeddings para temas/categorias. (Admin only)

---

## Temas

### GET /api/themes
Lista temas disponíveis com embeddings.

---

## Documentos (Usuário)

### GET /api/documents/[id]
Detalhes de um documento.

### GET /api/documents/[id]/content
Conteúdo textual de um documento.

---

## Miracles

### GET /api/miracles
Lista miracles do usuário.

### POST /api/miracles/generate/stream
Gera miracle com streaming SSE.

### GET/POST/PUT/DELETE /api/miracles/prompts
CRUD de prompts de miracles.

### GET/POST /api/miracles/copies
Histórico de cópias geradas.

---

## Auth

### POST /api/auth/reset-password
Inicia fluxo de reset de senha.

**Body:** `{ "email": "usuario@email.com" }`

### GET /api/auth/session
Retorna sessão atual.

---

## Utilitários

### GET /api/health
Health check (não requer auth).

**Response:** `{ "status": "ok", "timestamp": "..." }`

### GET /api/daily-teaching/test-api
Testa conectividade de um provider de IA.

**Query:** `?provider=claude&apiKey=your_api_key`

---

## Códigos de Status

| Status | Significado |
|--------|-------------|
| `200` | Sucesso |
| `400` | Input inválido |
| `401` | Não autenticado |
| `403` | Sem permissão (role insuficiente) |
| `404` | Recurso não encontrado |
| `429` | Rate limit atingido |
| `500` | Erro interno do servidor |

## Headers de Rate Limit

Todas as respostas de endpoints de chat incluem:
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 19
X-RateLimit-Reset: 1234567890
```
