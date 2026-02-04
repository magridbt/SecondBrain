# 🚀 Performance Optimization Plan
## SecondBrain-SriAmmaBhagavan

**Objetivo:** Suportar 100+ usuários simultâneos com resposta < 5 segundos
**Versão:** 1.0
**Data:** 2026-02-01
**Owner:** DevOps Agent (Gage)

---

## 📊 Baseline Atual

| Métrica | Valor Alvo | Status |
|---------|-----------|--------|
| **Response Time (p95)** | < 5s | A otimizar |
| **Concurrent Users** | 100+ | A validar |
| **Database Queries** | < 200ms | A monitorar |
| **Cache Hit Rate** | > 80% | A implementar |
| **API Rate** | 10 req/min (por usuário) | Configurado |

---

## 🎯 Areas de Otimização

### **1. Frontend Performance (Vercel)**

#### 1.1 Code Splitting & Lazy Loading
```typescript
// ✅ Implementar dynamic imports
import dynamic from 'next/dynamic';

const ChatInterface = dynamic(
  () => import('@/modules/secondbrain/components/Chat'),
  { loading: () => <ChatSkeleton />, ssr: true }
);

const AdminPanel = dynamic(
  () => import('@/modules/admin/components/AdminPanel'),
  { ssr: false }
);
```

**Benefício:** Reduz tamanho do bundle inicial em ~40%

#### 1.2 Image Optimization
- ✅ Usar `next/image` em todos os assets
- ✅ WebP format com fallback
- ✅ Placeholder blur para LCP (Largest Contentful Paint)
- ✅ Responsive images com `srcSet`

**Benefício:** Reduz tamanho de imagens em ~60%

#### 1.3 CSS & Tailwind Optimization
```javascript
// next.config.js
module.exports = {
  swcMinify: true,
  compress: true,
  productionBrowserSourceMaps: false,
};
```

**Benefício:** Menor tamanho de CSS (Tailwind purge automático)

#### 1.4 Streaming & Suspense
```typescript
// Usar streaming de respostas do Claude
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const stream = await claude.messages.create({
    stream: true, // ✅ Enable streaming
    // ...
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

**Benefício:** Resposta parcial visível em < 1s (vs aguardar resposta completa)

---

### **2. Backend Optimization (Supabase)**

#### 2.1 Database Query Optimization

**❌ Problema:** N+1 queries
```typescript
// Ruim - N+1 queries
const conversations = await supabase.from('conversations').select();
for (const conv of conversations) {
  const messages = await supabase
    .from('messages')
    .select()
    .eq('conversation_id', conv.id);
}
```

**✅ Solução:** Join + select único
```typescript
// Bom - Single query com join
const data = await supabase
  .from('conversations')
  .select('*, messages(id, content, created_at)')
  .eq('user_id', userId)
  .limit(50)
  .order('created_at', { ascending: false });
```

**Benefício:** Reduz queries de N+1 para 1

#### 2.2 Connection Pooling
```typescript
// Supabase já tem connection pooling integrado
// Mas validar:
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: 'public',
      // ✅ Pooling automático
    }
  }
);
```

**Benefício:** Reutiliza conexões (vs criar nova a cada query)

#### 2.3 Índices de Busca Vetorial (pgvector)
```sql
-- ✅ Índice HNSW para busca rápida de embeddings
CREATE INDEX idx_chunks_embedding_hnsw ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ✅ Índice para buscas frequentes
CREATE INDEX idx_documents_user_created ON documents(uploaded_by, created_at DESC);

-- ✅ Partial index para status indexed
CREATE INDEX idx_chunks_indexed ON document_chunks(document_id)
  WHERE documents.status = 'indexed';
```

**Benefício:** Busca vetorial de O(n) para O(log n)

#### 2.4 Prepared Statements
```typescript
// ✅ Use prepared queries via RPC
const { data } = await supabase.rpc('search_teachings', {
  query_embedding: embedding,
  match_threshold: 0.7,
  match_count: 5
});
```

**Benefício:** Query planning reutilizado (mais rápido)

---

### **3. Cache Strategy (Upstash Redis)**

#### 3.1 Response Cache (7 dias)
```typescript
// Cache respostas RAG similares
export async function cacheResponse(
  question: string,
  response: string,
  embedding: number[]
) {
  const questionHash = crypto
    .createHash('sha256')
    .update(question.toLowerCase().trim())
    .digest('hex');

  await redis.hset(
    `response:${questionHash}`,
    {
      response,
      embedding: JSON.stringify(embedding),
      hits: 1,
      createdAt: Date.now()
    }
  );

  // TTL: 7 dias
  await redis.expire(`response:${questionHash}`, 604800);
}
```

**Benefício:** Cache hit = resposta instantânea (< 100ms)

#### 3.2 User Session Cache
```typescript
// Cache sessão de usuário por 24h
await redis.hset(`user:${userId}`, {
  preferences: JSON.stringify(user.preferences),
  tokenUsageToday: user.tokenUsageToday,
  lastActivity: Date.now()
});

await redis.expire(`user:${userId}`, 86400);
```

**Benefício:** Evita query ao banco para dados frequentes

#### 3.3 Rate Limit Cache
```typescript
// Já implementado no architecture.md
// Upstash Redis para sliding window
const result = await chatRateLimiter.limit(userId);
```

**Benefício:** Rate limiting < 1ms (vs query ao banco)

---

### **4. API Optimization**

#### 4.1 Compression (gzip/brotli)
```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  const response = NextResponse.next();

  // ✅ Vercel auto-comprime, mas validar:
  response.headers.set('Vary', 'Accept-Encoding');

  return response;
}
```

**Benefício:** Reduz payload em ~70%

#### 4.2 Pagination & Lazy Loading
```typescript
// ✅ Paginar histórico de conversas
const conversations = await supabase
  .from('conversations')
  .select('id, title, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(0, 20)      // ✅ Primeiros 20
  .limit(20);

// Cliente faz: offset += 20 para próxima página
```

**Benefício:** Carrega só dados necessários (vs todos os dados)

#### 4.3 Batch Operations
```typescript
// ✅ Processar múltiplas requisições em batch
async function batchGetConversations(conversationIds: string[]) {
  return await supabase
    .from('conversations')
    .select()
    .in('id', conversationIds);  // ✅ IN query (uma query, múltiplos IDs)
}
```

**Benefício:** 1 query para N registros (vs N queries)

---

### **5. LLM & Embeddings Optimization**

#### 5.1 Embedding Cache
```typescript
// Cache embeddings de perguntas frequentes
const embeddingCache = new Map<string, number[]>();

export async function getOrCreateEmbedding(text: string) {
  const hash = crypto.createHash('sha256').update(text).digest('hex');

  if (embeddingCache.has(hash)) {
    return embeddingCache.get(hash)!;
  }

  const embedding = await voyageAI.embed(text);
  embeddingCache.set(hash, embedding);

  return embedding;
}
```

**Benefício:** Embedding = $0.02 (vs 1 cache hit = $0)

#### 5.2 Batch Embedding Processing
```typescript
// Processar múltiplos chunks em batch
const chunks = [...]; // 100 chunks

const embeddings = await voyageAI.embed({
  input: chunks.map(c => c.content),
  model: 'voyage-2'
});

// Salvar todos em batch
await supabase
  .from('document_chunks')
  .upsert(
    chunks.map((chunk, idx) => ({
      ...chunk,
      embedding: embeddings[idx]
    }))
  );
```

**Benefício:** 1 chamada API para 100 chunks (vs 100 chamadas)

#### 5.3 Claude Streaming Response
```typescript
// ✅ Streaming já configurado na architecture
// Cliente recebe resposta parcial em tempo real
// vs aguardar resposta completa
```

**Benefício:** TTFB (Time To First Byte) = ~500ms

---

### **6. Monitoring & Performance Metrics**

#### 6.1 Sentry Performance Monitoring
```typescript
// src/shared/lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

export function initPerformanceMonitoring() {
  Sentry.init({
    tracesSampleRate: 0.1, // 10% das requisições

    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],
  });
}

// Track custom operations
export function trackOperation(name: string, fn: () => Promise<T>) {
  const transaction = Sentry.startTransaction({
    op: name,
    name: `Operation: ${name}`,
  });

  return fn().finally(() => transaction.finish());
}
```

**Benefício:** Identifica gargalos automaticamente

#### 6.2 Web Vitals Tracking
```typescript
// pages/app/layout.tsx
import { useReportWebVitals } from 'next/web-vitals';

export function reportWebVitals(metric: NextWebVitalsMetric) {
  // FCP: First Contentful Paint
  // LCP: Largest Contentful Paint
  // CLS: Cumulative Layout Shift
  // FID: First Input Delay
  // TTFB: Time To First Byte

  console.log(metric);
}
```

**Benefício:** Monitorar UX real em produção

#### 6.3 Custom Metrics
```typescript
// Track operações críticas
export async function trackRAGQuery(
  question: string,
  userId: string
) {
  const startTime = performance.now();

  try {
    const result = await ragQuery(question, userId);
    const duration = performance.now() - startTime;

    // Log métrica
    await logMetric({
      operation: 'rag_query',
      duration,
      user_id: userId,
      cache_hit: result.fromCache,
      response_time: duration
    });

    return result;
  } catch (error) {
    // Log erro
  }
}
```

**Benefício:** Visibilidade do comportamento em produção

---

## 📈 Implementação Timeline

### **Phase 1: Quick Wins (1-2 semanas)**
- [ ] Índices pgvector + HNSW
- [ ] Code splitting + dynamic imports
- [ ] Response cache (Redis)
- [ ] Lazy loading de imagens
- [ ] Compression (gzip)

**Impacto esperado:** 30-40% mais rápido

### **Phase 2: Medium Term (2-4 semanas)**
- [ ] Connection pooling validation
- [ ] Session cache (Redis)
- [ ] Embedding cache
- [ ] Pagination implementado
- [ ] Sentry setup completo

**Impacto esperado:** 50-60% mais rápido

### **Phase 3: Long Term (1+ mês)**
- [ ] Database denormalization (se necessário)
- [ ] CDN para assets estáticos
- [ ] Load testing (100+ users)
- [ ] Query profiling detalhado
- [ ] Auto-scaling infrastructure

**Impacto esperado:** 70-80% mais rápido

---

## ✅ Checklist de Validação

### Performance Targets
- [ ] Response time p95 < 5s
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 3s
- [ ] Time to Interactive < 3.5s
- [ ] Cache hit rate > 80%
- [ ] Database query time < 200ms

### Load Testing
- [ ] Teste com 50 usuários simultâneos
- [ ] Teste com 100 usuários simultâneos
- [ ] Teste com 200 usuários (stress test)
- [ ] Validar behavior em rate limits
- [ ] Validar fallback de LLM sob carga

### Monitoring
- [ ] Sentry alerts configurados
- [ ] Web Vitals tracking ativo
- [ ] Custom metrics sendo coletadas
- [ ] Dashboard de performance criado
- [ ] Alertas automáticos para degradação

---

## 🔧 Próximos Passos

1. **Priorizar Phase 1** - Quick wins com maior impacto
2. **Implementar índices** - Começar com database optimization
3. **Setup Sentry** - Monitorar desde o início
4. **Load testing** - Validar melhorias com teste real
5. **Iterate** - Medir → Otimizar → Validar

---

**Owner:** Gage (DevOps Agent)
**Status:** Planejado
**Próxima Revisão:** Após Phase 1
