# 🔒 Guia de Segurança - SecondBrain

## ⚠️ NUNCA Compartilhe Credenciais

Seus arquivos `.env.local` contêm chaves de API reais que devem NUNCA ser:
- Versionadas no git
- Compartilhadas em screenshots
- Commitadas no repositório
- Expostas publicamente

## ✅ Setup Seguro - Passo a Passo

### 1. Criar `.env.local` (Nunca commitar!)

```bash
cp .env.example .env.local
```

### 2. Adicionar suas chaves REAIS no `.env.local`

```bash
# .env.local (NUNCA commitar este arquivo!)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
RESEND_API_KEY=re_...
PORT=3000
```

### 3. Verificar que `.env.local` está ignorado

```bash
# Deve retornar: .gitignore:8:.env.local
git check-ignore -v .env.local
```

### 4. Verificar status

```bash
# Deve estar vazio (não deve rastrear .env.local)
git ls-files | grep ".env"
# Saída: .env.example (apenas este!)
```

## 🛡️ Proteções Automáticas

### Pre-commit Hook
Um script automático (``.git/hooks/pre-commit`) **bloqueia commits com credenciais**.

Se você tentar fazer commit com uma chave exposta:
```
❌ BLOCKED: Found potential credential in src/file.ts
   Pattern: sk-ant-
🚨 COMMIT BLOCKED - Credentials detected!
```

### .gitignore
```
.env
.env.local
.env.*.local
```

## 🔄 Se uma credencial foi exposta:

1. **IMEDIATAMENTE:**
   - Revogue a chave na plataforma (Anthropic, OpenAI, Supabase, etc)
   - Gere uma nova chave

2. **Atualize `.env.local`:**
   ```bash
   # Editar .env.local com a NOVA chave
   nano .env.local
   ```

3. **Verifique que não foi commitada:**
   ```bash
   git log --all -p | grep "sk-ant-" # Não deve retornar nada
   ```

## ✨ Boas Práticas

| Fazer ✅ | Não Fazer ❌ |
|---------|------------|
| Manter credenciais em `.env.local` | Versioná-las no git |
| Usar `.env.example` como template | Commitar valores reais |
| Revogar chaves expostas ASAP | Reutilizar chaves comprometidas |
| Compartilhar screenshots sem `.env.local` aberto | Compartilhar screenshots com credenciais visíveis |
| Usar git check-ignore regularmente | Assumir que está ignorado |

## 🚀 Teste o Setup

```bash
# Iniciar dev server
npm run dev

# Testar que credenciais estão carregadas
curl http://localhost:3000/api/health

# Resposta esperada: 200 OK (servidor conectado ao Supabase)
```

## 📋 Checklist Semanal

- [ ] Credenciais não foram compartilhadas
- [ ] `.env.local` não aparece em `git status`
- [ ] `.env.example` contém apenas valores vazios
- [ ] Pre-commit hook está ativo
- [ ] Nenhum arquivo `.env.local` versionado

---

**Lembre-se:** Credenciais vazadas = Conta hackeada = Retrabalho desnecessário 🚨

Se algo não funcionou, execute:
```bash
git check-ignore -v .env.local    # Verificar ignore
git status .env.local              # Verificar status
echo $ANTHROPIC_API_KEY            # Verificar carregamento
```
