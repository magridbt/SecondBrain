# Documentação de Segurança - Second Brain

**Versão:** 2.0
**Data:** 23 de Janeiro de 2026
**Status:** Implementado e Auditado

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Infraestrutura de Segurança](#infraestrutura-de-segurança)
3. [Autenticação e Autorização](#autenticação-e-autorização)
4. [Validação de Dados](#validação-de-dados)
5. [Rate Limiting](#rate-limiting)
6. [Criptografia](#criptografia)
7. [Logging Seguro](#logging-seguro)
8. [Cache e Performance](#cache-e-performance)
9. [Políticas RLS do Banco](#políticas-rls-do-banco)
10. [Headers de Segurança](#headers-de-segurança)
11. [Checklist de Deploy](#checklist-de-deploy)

---

## Visão Geral

O Second Brain implementa múltiplas camadas de segurança para proteger dados de usuários e garantir a integridade do sistema:

```
┌─────────────────────────────────────────────────────────────┐
│                     CAMADAS DE SEGURANÇA                     │
├─────────────────────────────────────────────────────────────┤
│  1. Security Headers (CSP, HSTS, X-Frame-Options)           │
│  2. Rate Limiting (Upstash Redis)                           │
│  3. Autenticação (Supabase Auth)                            │
│  4. Validação de Input (Zod Schemas)                        │
│  5. Autorização (RLS Policies)                              │
│  6. Criptografia (AES-256-GCM)                              │
│  7. Logging Seguro (Sanitização automática)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Infraestrutura de Segurança

### Middleware de Segurança Central

**Arquivo:** `src/lib/middleware/security.ts`

O `createSecureHandler()` é um wrapper que pode ser usado em qualquer rota API para aplicar todas as proteções de segurança automaticamente:

```typescript
import { createSecureHandler } from '@/lib/middleware/security'
import { MySchema } from '@/lib/schemas/api'

export const POST = createSecureHandler(
  async ({ user, validated, supabase }) => {
    // user: usuário autenticado
    // validated: dados validados pelo schema
    // supabase: cliente Supabase do usuário

    return NextResponse.json({ success: true })
  },
  {
    requireAuth: true,           // Requer autenticação
    requireAdmin: false,         // Requer role admin
    rateLimit: chatRateLimiter,  // Rate limiter específico
    schema: MySchema,            // Schema Zod para validação
    csrfProtection: true,        // Proteção CSRF
  }
)
```

### Funcionalidades do Security Handler

| Funcionalidade | Descrição |
|----------------|-----------|
| Autenticação | Verifica sessão do usuário via Supabase Auth |
| Autorização | Verifica role (admin/member) quando necessário |
| Rate Limiting | Aplica limites por usuário/IP |
| Validação | Valida body/query com Zod schemas |
| CSRF | Verifica token CSRF em requests mutating |
| Logging | Log seguro sem dados sensíveis |
| Headers | Adiciona security headers na resposta |

---

## Autenticação e Autorização

### Helpers de Autenticação

**Arquivo:** `src/lib/auth-helpers.ts`

```typescript
import {
  getAuthenticatedUser,
  requireAuth,
  requireAdmin,
  isAdmin,
  hasModuleAccess
} from '@/lib/auth-helpers'

// Obter usuário atual com role
const user = await getAuthenticatedUser()
// Returns: { id, email, role, fullName } | null

// Verificar se é admin
const adminCheck = await isAdmin(userId)
// Returns: boolean

// Verificar acesso a módulo
const hasAccess = await hasModuleAccess(userId, 'sri_ab_teachings')
// Returns: boolean
```

### Roles do Sistema

| Role | Permissões |
|------|------------|
| `admin` | Acesso total, gerenciamento de usuários e documentos |
| `member` | Acesso aos módulos permitidos, criação de conteúdo próprio |
| `visitor` | Apenas visualização de conteúdo público |

### Controle de Acesso por Módulo

Usuários podem ter acesso a módulos específicos através do campo `module_access` em `profiles`:

```sql
-- Verificar acesso via função SQL
SELECT has_module_access(user_id, 'sri_ab_teachings');
```

---

## Validação de Dados

### Schemas Zod Centralizados

**Arquivo:** `src/lib/schemas/api.ts`

Todos os schemas de validação estão centralizados:

```typescript
// Chat
ChatRequestSchema        // message, conversationId, themes, directQuoteMode

// AI Settings
AISettingsUpdateSchema   // provider, model, temperature, max_tokens, api_keys

// Conversations
ConversationCreateSchema // title, module
ConversationIdSchema     // id (UUID)

// Documents
DocumentUploadSchema     // name, source_id, metadata
DocumentIdQuerySchema    // id (UUID)

// Invites
InviteCreateSchema       // email, moduleAccess[]

// Prompts
PromptCreateSchema       // title, content, category, is_public, slug
PromptUpdateSchema       // partial of create
PromptIdQuerySchema      // id (UUID)

// Auth
ResetPasswordSchema      // password (8+ chars, upper, lower, number)

// Common
PaginationSchema         // page, limit (1-100)
UUIDParamSchema          // id (UUID format)
```

### Regras de Validação

| Campo | Regra |
|-------|-------|
| `message` | 1-10000 caracteres |
| `email` | Formato válido, max 255 chars |
| `password` | Min 8 chars, 1 maiúscula, 1 minúscula, 1 número |
| `temperature` | 0.0 - 2.0 |
| `max_tokens` | 100 - 8000 |
| `slug` | Apenas lowercase, números e hífens |
| `limit` (paginação) | 1 - 100 |

---

## Rate Limiting

### Configuração de Limites

**Arquivo:** `src/lib/ratelimit.ts`

| Limiter | Limite | Janela | Uso |
|---------|--------|--------|-----|
| `chatRateLimiter` | 10 requests | 1 minuto | API de chat |
| `uploadRateLimiter` | 5 uploads | 1 hora | Upload de documentos |
| `generalRateLimiter` | 60 requests | 1 minuto | APIs gerais |
| `adminRateLimiter` | 30 requests | 1 minuto | Operações admin |
| `authRateLimiter` | 5 tentativas | 15 minutos | Login/autenticação |
| `passwordResetRateLimiter` | 3 tentativas | 1 hora | Reset de senha |

### Uso em Rotas

```typescript
import { chatRateLimiter, getRateLimitHeaders } from '@/lib/ratelimit'

const { success, limit, remaining, reset } = await chatRateLimiter.limit(userId)

if (!success) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429, headers: getRateLimitHeaders({ limit, remaining, reset }) }
  )
}
```

### Headers de Resposta

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1706045123
```

---

## Criptografia

### Configuração

**Arquivo:** `src/lib/encryption.ts`

- **Algoritmo:** AES-256-GCM
- **Derivação de Chave:** scrypt
- **IV:** 16 bytes aleatórios por operação
- **Auth Tag:** 16 bytes

### Variáveis de Ambiente Obrigatórias

```env
# OBRIGATÓRIO em produção (mínimo 32 caracteres)
ENCRYPTION_KEY=sua-chave-secreta-minimo-32-caracteres
```

### Uso

```typescript
import { encryptKey, decryptKey } from '@/lib/encryption'

// Criptografar API key antes de salvar
const encrypted = encryptKey('sk-ant-api-key-here')

// Descriptografar para uso
const decrypted = decryptKey(encrypted)
```

### Segurança em Produção

- **Sem fallback:** Em produção, a aplicação falha se `ENCRYPTION_KEY` não estiver configurada
- **Validação de tamanho:** Chave deve ter no mínimo 32 caracteres
- **Detecção de chave padrão:** Erro se usar valor placeholder

---

## Logging Seguro

### Configuração

**Arquivo:** `src/lib/logger.ts`

O sistema de logging automaticamente sanitiza dados sensíveis:

### Campos Automaticamente Redatados

```typescript
const SENSITIVE_FIELDS = [
  'password', 'senha', 'secret', 'token', 'apiKey', 'api_key',
  'authorization', 'auth', 'credential', 'private', 'accessToken',
  'refreshToken', 'sessionToken', 'jwt', 'bearer', 'anthropic_api_key',
  'openai_api_key', 'gemini_api_key', 'encryption_key'
]
```

### Uso

```typescript
import { secureLog } from '@/lib/logger'

// Dados sensíveis são automaticamente redatados
secureLog('info', 'User login', {
  userId: 'user-123',
  email: 'user@example.com',  // -> 'user@*****.com'
  password: 'secret123',       // -> '[REDACTED]'
  apiKey: 'sk-ant-xxx-yyy'     // -> 'sk-a...yyy'
})
```

### Níveis de Log

| Nível | Uso |
|-------|-----|
| `debug` | Informações de desenvolvimento |
| `info` | Operações normais |
| `warn` | Situações inesperadas mas não críticas |
| `error` | Erros que precisam atenção |

---

## Cache e Performance

### Configuração Redis

**Arquivo:** `src/lib/cache.ts`

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

### TTL por Tipo de Cache

| Cache | TTL | Uso |
|-------|-----|-----|
| Admin Check | 5 min | Verificação de role admin |
| User Modules | 5 min | Lista de módulos do usuário |
| User Profile | 5 min | Dados do perfil |
| Themes | 10 min | Lista de temas |
| Sources | 10 min | Fontes de ensino |

### Funções de Cache

```typescript
import {
  cachedIsAdmin,
  cachedUserModules,
  cachedThemes,
  invalidateUserCache
} from '@/lib/cache'

// Cache com fallback para fetch
const isAdmin = await cachedIsAdmin(userId, async () => {
  // Fetch do banco se não estiver em cache
  return await checkAdminInDB(userId)
})

// Invalidar cache quando role muda
await invalidateUserCache(userId)
```

---

## Políticas RLS do Banco

### Tabelas com RLS Habilitado

- `profiles`
- `invites`
- `teaching_sources`
- `documents`
- `document_chunks`
- `conversations`
- `messages`
- `feedback`
- `audit_logs`
- `response_cache`
- `themes`
- `document_themes`
- `daily_messages`
- `custom_prompts`
- `user_ai_settings`

### Políticas Principais

```sql
-- Usuários só veem próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins veem todos os perfis
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- Usuários gerenciam próprias conversas
CREATE POLICY "Users can manage own conversations" ON conversations
  FOR ALL USING (auth.uid() = user_id);

-- Documentos indexados visíveis para autenticados
CREATE POLICY "Authenticated users can view indexed documents" ON documents
  FOR SELECT TO authenticated
  USING (status = 'indexed' AND deleted_at IS NULL);
```

### Funções de Segurança SQL

```sql
-- Verificar se usuário é admin
CREATE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Incrementar uso de prompt (SECURITY DEFINER)
CREATE FUNCTION increment_prompt_usage(prompt_id UUID) RETURNS BOOLEAN;

-- Verificar acesso a módulo
CREATE FUNCTION has_module_access(user_uuid UUID, module_slug TEXT) RETURNS BOOLEAN;
```

---

## Headers de Segurança

### Configuração no Middleware

**Arquivo:** `middleware.ts`

```typescript
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// Em produção
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
```

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co https://api.anthropic.com wss://*.supabase.co;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

---

## Checklist de Deploy

### Variáveis de Ambiente Obrigatórias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Criptografia (OBRIGATÓRIO, min 32 chars)
ENCRYPTION_KEY=xxx

# Rate Limiting
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# AI Providers (pelo menos um)
ANTHROPIC_API_KEY=xxx
OPENAI_API_KEY=xxx
GEMINI_API_KEY=xxx

# Embeddings
VOYAGE_API_KEY=xxx
```

### Verificações Pré-Deploy

- [ ] `ENCRYPTION_KEY` configurada (mínimo 32 caracteres)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` segura e não exposta
- [ ] Redis configurado para rate limiting
- [ ] Todas as migrações SQL aplicadas
- [ ] HTTPS habilitado
- [ ] Domínio configurado no Supabase Auth
- [ ] Redirect URLs configurados

### Migrações SQL Necessárias

```bash
# Aplicar todas as migrações
supabase db push

# Ou manualmente
psql -f supabase/migrations/20260123120000_add_security_policies.sql
```

---

## Arquivos de Segurança

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/middleware/security.ts` | Handler de segurança central |
| `src/lib/encryption.ts` | Criptografia AES-256-GCM |
| `src/lib/ratelimit.ts` | Rate limiting com Upstash |
| `src/lib/logger.ts` | Logging seguro com sanitização |
| `src/lib/cache.ts` | Cache Redis com TTL |
| `src/lib/auth-helpers.ts` | Helpers de autenticação |
| `src/lib/schemas/api.ts` | Schemas Zod centralizados |
| `src/lib/types/search.ts` | Types seguros (sem `any`) |
| `middleware.ts` | Security headers globais |
| `supabase/migrations/*.sql` | Políticas RLS |

---

## Contato de Segurança

Para reportar vulnerabilidades de segurança, entre em contato através dos canais apropriados antes de divulgar publicamente.

---

*Documentação gerada em: 23 de Janeiro de 2026*
*Última auditoria: 23 de Janeiro de 2026 - Status: APROVADO*
