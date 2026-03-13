# Guia de Deploy — Sri AB Teachings SecondBrain

---

## Infraestrutura de Produção

| Serviço | Provider | URL |
|---------|----------|-----|
| Frontend + API Routes | Vercel | (configurar no projeto Vercel) |
| Banco de dados | Supabase | zvuzkuyqeapbmfmcngae |
| Cache + Rate Limit | Upstash Redis | (configurar no Upstash) |
| Embeddings | Voyage AI | api.voyageai.com |
| LLM primário | Anthropic | api.anthropic.com |
| Error tracking | Sentry | sentry.io |

---

## Deploy no Vercel

### Configuração inicial

1. Conectar o repositório ao Vercel
2. Framework preset: **Next.js**
3. Build command: `npm run build`
4. Output directory: `.next`
5. Install command: `npm install`

### Variáveis de ambiente no Vercel

No painel do projeto → Settings → Environment Variables, adicionar todas as variáveis do `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
GOOGLE_AI_API_KEY
VOYAGE_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
NEXT_PUBLIC_SENTRY_DSN
SENTRY_DSN
```

**Importante:** As variáveis com prefixo `NEXT_PUBLIC_` são expostas ao browser — nunca colocar chaves secretas nelas.

### Deploy

```bash
# Deploy automático ao push para main
git push origin main

# Deploy manual (Vercel CLI)
npx vercel --prod
```

---

## Configuração do Supabase

### Migrations

Execute os migrations em ordem no **Supabase Dashboard → SQL Editor**:

```
migrations/001_initial_schema.sql
migrations/002_*.sql
...
migrations/005_system_settings.sql   # ← Criado na v1.5
```

Ou via psql direto:
```bash
psql "postgresql://postgres:[SENHA]@db.zvuzkuyqeapbmfmcngae.supabase.co:5432/postgres" \
  -f migrations/005_system_settings.sql
```

### Funções RPC

As funções de busca vetorial são criadas pelos migrations. Verificar se existem:

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_type = 'FUNCTION' AND routine_name LIKE 'search_teachings%';
```

Deve retornar:
- `search_teachings`
- `search_teachings_optimized`

### Auth

Em **Supabase Dashboard → Authentication → URL Configuration:**

- **Site URL:** URL do deploy Vercel (ex: `https://seu-projeto.vercel.app`)
- **Redirect URLs:**
  - `https://seu-projeto.vercel.app/reset-password`
  - `https://seu-projeto.vercel.app/invite/*`
  - `http://localhost:3000/**` (para desenvolvimento)

### Storage

O bucket `avatars` deve ser criado e configurado como **público**:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);
```

Política de RLS para upload (admin apenas):
```sql
CREATE POLICY "Admin can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
```

---

## Configuração do Upstash Redis

1. Criar database no Upstash console
2. Copiar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`
3. O sistema usa Redis para:
   - **Rate limiting:** 20 requests/hora por usuário (configurável em `src/lib/ratelimit.ts`)
   - **Cache de embeddings:** TTL padrão 7 dias

---

## Checklist Pré-Deploy

- [ ] Todas as variáveis de ambiente configuradas no Vercel
- [ ] Migrations executados no Supabase (todos os arquivos em `migrations/`)
- [ ] Funções RPC `search_teachings` e `search_teachings_optimized` existem
- [ ] Bucket `avatars` criado e público no Supabase Storage
- [ ] URL de redirect configurada no Supabase Auth
- [ ] Chave Voyage AI válida (testar: `curl https://api.voyageai.com/v1/embeddings -H "Authorization: Bearer $VOYAGE_API_KEY"`)
- [ ] Chave Anthropic válida
- [ ] Upstash Redis acessível
- [ ] Build local limpo: `npm run build`
- [ ] Primeiro usuário admin criado no Supabase Auth + perfil com role='admin' na tabela `profiles`

---

## Criar Primeiro Admin

Após o deploy:

1. Criar conta normal pelo formulário de signup
2. No Supabase SQL Editor:

```sql
-- Promover usuário para admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'seu@email.com';

-- Verificar
SELECT id, email, role FROM profiles WHERE email = 'seu@email.com';
```

---

## Monitoramento em Produção

### Sentry
- Acesse o painel Sentry para ver erros em tempo real
- Erros de API routes são capturados automaticamente

### Supabase
- **Dashboard → Logs:** Ver queries SQL e erros em tempo real
- **Dashboard → Usage:** Monitorar uso de banco de dados e storage

### Vercel
- **Deployments:** Ver logs de cada deploy
- **Functions:** Logs das API routes serverless
- **Analytics:** Métricas de performance

### Upstash
- **Console → Metrics:** Ver taxa de hit do cache de embeddings
- **Console → Usage:** Monitorar uso de rate limiting

---

## Rollback

```bash
# Ver deployments recentes
vercel list

# Promover deployment anterior
vercel promote [deployment-url]
```

No Supabase, migrations não têm rollback automático. Se necessário, desfazer manualmente com SQL.

---

## Variáveis de Configuração Editáveis em Runtime

Após o deploy, as configurações de branding podem ser alteradas pelo admin sem novo deploy:
- System Name, Subtitle e Avatar via **Admin → Settings → Customization**
- Os dados são persistidos na tabela `system_settings` e carregados por todos os usuários automaticamente
