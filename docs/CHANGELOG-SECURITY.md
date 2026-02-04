# Changelog de Segurança

Todas as mudanças relacionadas à segurança do projeto Second Brain.

---

## [2.0.0] - 2026-01-23

### Adicionado

#### Fase 1: Infraestrutura de Segurança
- **`src/lib/middleware/security.ts`** - Novo wrapper `createSecureHandler()` para rotas API
  - Autenticação centralizada
  - Rate limiting integrado
  - Validação CSRF
  - Logging seguro automático
  - Security headers

- **`src/lib/logger.ts`** - Sistema de logging seguro
  - Sanitização automática de dados sensíveis
  - Redação de passwords, tokens, API keys
  - Mascaramento de emails
  - Suporte a objetos aninhados

- **`middleware.ts`** - Headers de segurança globais
  - Content Security Policy (CSP)
  - HTTP Strict Transport Security (HSTS)
  - X-Frame-Options: DENY
  - X-XSS-Protection
  - Referrer-Policy
  - Permissions-Policy
  - Geração de CSRF token

#### Fase 2: Validação de Dados
- **`src/lib/schemas/api.ts`** - Schemas Zod centralizados
  - ChatRequestSchema
  - AISettingsUpdateSchema
  - ConversationCreateSchema
  - DocumentUploadSchema
  - InviteCreateSchema
  - PromptCreateSchema
  - ResetPasswordSchema
  - PaginationSchema
  - UUIDParamSchema

#### Fase 3: Políticas de Banco de Dados
- **`supabase/migrations/20260123120000_add_security_policies.sql`**
  - Função `increment_prompt_usage()` com SECURITY DEFINER
  - Função `has_module_access()` para controle de módulos
  - Coluna `deleted_at` em `document_chunks`
  - Coluna `module_access` em `profiles`
  - Políticas RLS para documents e document_chunks

#### Fase 4: Testes
- **`src/__tests__/lib/logger.test.ts`** - 17 testes
- **`src/__tests__/lib/schemas.test.ts`** - 31 testes
- **`src/__tests__/lib/cache.test.ts`** - 7 testes
- **`src/__tests__/lib/auth-helpers.test.ts`** - 10 testes
- **`src/__tests__/lib/ratelimit.test.ts`** - 5 testes

#### Fase 5: Cache e Performance
- **`src/lib/cache.ts`** - Sistema de cache Redis
  - `cachedIsAdmin()` - Cache de verificação admin (5 min)
  - `cachedUserModules()` - Cache de módulos (5 min)
  - `cachedThemes()` - Cache de temas (10 min)
  - `invalidateUserCache()` - Invalidação seletiva

- **`src/lib/auth-helpers.ts`** - Helpers de autenticação
  - `getAuthenticatedUser()`
  - `requireAuth()`
  - `requireAdmin()`
  - `isAdmin()`
  - `hasModuleAccess()`
  - `validateResourceOwnership()`

#### Fase 6: Qualidade de Código
- **`src/lib/types/search.ts`** - Types para semantic search
  - DocumentChunk, DocumentChunkWithScore
  - SearchResult, SemanticSearchResponse
  - VoyageEmbeddingResponse

### Modificado

#### Segurança de Criptografia
- **`src/lib/encryption.ts`**
  - Removido fallback key em produção
  - Adicionada validação de tamanho mínimo (32 chars)
  - Erro se ENCRYPTION_KEY não configurada em prod

#### Rate Limiting
- **`src/lib/ratelimit.ts`**
  - Chat: 20 → 10 req/min
  - Upload: 10 → 5/hora
  - General: 100 → 60 req/min
  - Adicionado `adminRateLimiter` (30/min)
  - Adicionado `authRateLimiter` (5/15min)
  - Adicionado `passwordResetRateLimiter` (3/hora)

#### Rotas API Atualizadas
- **`src/app/api/ai-settings/route.ts`**
  - Adicionada validação Zod
  - Adicionado rate limiting
  - Adicionado secure logging

- **`src/app/api/conversations/route.ts`**
  - Adicionada validação Zod
  - Adicionado rate limiting
  - Adicionado audit logging

- **`src/app/api/admin/invites/route.ts`**
  - Adicionada validação Zod
  - Adicionado admin rate limiting
  - Verificação de role admin

- **`src/app/api/prompts/route.ts`**
  - Adicionada validação Zod
  - Verificação de ownership
  - Rate limiting

- **`src/app/api/themes/route.ts`**
  - Adicionado cache Redis
  - Rate limiting

- **`src/app/api/documents/[id]/route.ts`**
  - Removido AdminClient (usa RLS)
  - Adicionada validação Zod
  - Rate limiting

- **`src/app/api/auth/session/route.ts`**
  - Removido AdminClient
  - Adicionado auth rate limiting
  - Audit logging

- **`src/app/api/daily-message/generate/route.ts`**
  - Removido AdminClient
  - Usa RPC `increment_prompt_usage()`
  - Tipagem corrigida (sem `any`)

#### Tipagem Melhorada
- **`src/lib/semantic-search.ts`**
  - Removidos todos os `any` types
  - Usa interfaces de `types/search.ts`
  - Type assertions seguros

### Removido

- Fallback de ENCRYPTION_KEY em produção
- Uso desnecessário de AdminClient em rotas de usuário
- Types `any` em arquivos críticos

---

## Estatísticas

| Métrica | Valor |
|---------|-------|
| Arquivos criados | 12 |
| Arquivos modificados | 15 |
| Testes adicionados | 70+ |
| `any` types removidos | 14 |
| Schemas Zod criados | 15 |
| Migrações SQL | 1 |

---

## Verificação

```bash
# Rodar testes
npm run test:run
# Resultado: 143 testes passando

# Build de produção
npm run build
# Resultado: Build bem-sucedido

# Lint
npm run lint
# Resultado: Apenas warnings pré-existentes (React hooks)
```

---

## Próximos Passos Recomendados

1. **Aplicar migração SQL** em produção
   ```bash
   supabase db push
   ```

2. **Configurar variáveis de ambiente** em produção
   - `ENCRYPTION_KEY` (obrigatório, min 32 chars)
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

3. **Monitorar rate limits** e ajustar conforme uso real

4. **Adicionar mais testes** para atingir 80% de cobertura

5. **Considerar refatorar** `semantic-search.ts` em módulos menores

---

*Changelog gerado em: 23 de Janeiro de 2026*
