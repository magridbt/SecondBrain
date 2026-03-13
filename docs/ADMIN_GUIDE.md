# Guia do Administrador — Sri AB Teachings SecondBrain

---

## Acesso ao Painel Admin

O painel admin está disponível em `/app/admin/` para usuários com role `admin`.

Seções disponíveis:
- **Documentos** — gerenciar base de conhecimento
- **Membros** — gerenciar usuários e acessos
- **Auditoria** — logs de atividade
- **Histórico** — conversas de todos os usuários
- **Configurações** — branding e fontes

---

## 1. Gerenciar Documentos

### Fontes de Ensinamento

Os documentos são organizados em **Fontes** (`teaching_sources`). Fontes ativas são incluídas na busca semântica; fontes inativas são ignoradas.

**Fontes padrão:**
- 81000 Program
- Kalki Dharma
- Great Compassionate Light
- Sri AB Original
- Tejasaji

Para adicionar/editar fontes: **Settings → Teaching Sources → New Source**

### Upload de Documentos

Em **Admin → Documents → Upload Document:**

1. Selecionar a fonte
2. Fazer upload do arquivo (PDF, DOCX, TXT) ou colar texto diretamente
3. Preencher metadados conforme o tipo de fonte:
   - **81000 Program:** Ano do programa, Data do darshan, Idioma
   - **Kalki Dharma / Great Compassionate Light:** URL do YouTube, Data de publicação, Idioma
   - **Sri AB Original / Tejasaji:** Origem, Data, Idioma
4. Clicar em Upload

O sistema automaticamente:
- Extrai o texto do arquivo
- Divide o texto em chunks
- Gera embeddings via Voyage AI (voyage-2)
- Armazena no pgvector para busca semântica

**Status de processamento:**
- `pending` — aguardando processamento
- `processing` — gerando embeddings
- `indexed` — pronto para busca
- `error` — falha no processamento (pode reprocessar)

### Reprocessar Documento

Se um documento ficou em estado `error` ou se os embeddings precisam ser atualizados:
- Clique no ícone de reprocessar no documento
- Aguarde o status mudar para `indexed`

### Remover Documento

O delete é **soft** — o documento não é fisicamente removido, apenas marcado com `deleted_at`. Não aparecerá mais nas buscas.

---

## 2. Gerenciar Membros

### Convidar Usuário

Em **Admin → Members → Invite Member:**
1. Inserir email do usuário
2. Selecionar role: `admin` ou `member`
3. Selecionar módulo e role no módulo
4. Enviar convite

O usuário receberá um email com link de convite. Ao aceitar, a conta é criada automaticamente com as permissões definidas.

### Roles

| Role | Acesso |
|------|--------|
| `admin` | Painel admin completo + todos os módulos |
| `member` | Apenas módulos liberados + sem painel admin |

### Roles de Módulo

| Role | Acesso no módulo |
|------|-----------------|
| `admin` | Gerenciar conteúdo do módulo |
| `editor` | Criar e editar conteúdo |
| `viewer` | Apenas leitura |

### Revogar Acesso

Em **Admin → Members**, clique em "Remove" para revogar acesso de um membro. O usuário não conseguirá mais fazer login.

---

## 3. Auditoria e Logs

### Audit Logs

Em **Admin → Audit Logs:**
- Cada ação de chat é registrada com:
  - Usuário (email)
  - Tipo de ação
  - Preview da mensagem (200 chars)
  - Timestamp
  - Trace ID

### Conteúdo Sinalizado

O sistema detecta automaticamente padrões suspeitos nas mensagens dos usuários e registra em `flagged_content`. Severidades: `low`, `medium`, `high`.

### Histórico de Conversas

Em **Admin → History:**
- Ver todas as conversas de todos os usuários
- Expandir para ver mensagens completas
- Buscar por nome de usuário, email ou conteúdo de mensagem

---

## 4. Configurações do Sistema

### Branding

Em **Admin → Settings → Customization:**

1. **Avatar:** Clique no avatar para fazer upload de nova imagem (armazenada no Supabase Storage, bucket `avatars`)
2. **System Name:** Nome exibido no topo do sidebar
3. **Subtitle:** Subtítulo exibido abaixo do nome
4. Clicar em "Save Changes"

As configurações são salvas no banco de dados (`system_settings`) e propagadas para todos os usuários na próxima atualização da página.

---

## 5. Limites de Uso

Os limites de tokens por usuário são gerenciados na tabela `usage_limits`. Para ajustar limites:

Acesse o Supabase Dashboard → Table Editor → `usage_limits`

Campos:
- `role` — `admin`, `member`, etc.
- `monthly_token_limit` — total de tokens por mês
- `daily_token_limit` — total de tokens por dia

---

## 6. Monitoramento

### Uso de Tokens

Tabela `token_usage` registra cada chamada de IA:
- Por usuário, modelo e provider
- Input tokens + output tokens
- Endpoint utilizado

Consulta útil (Supabase SQL Editor):
```sql
SELECT user_id, SUM(input_tokens + output_tokens) as total_tokens
FROM token_usage
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_tokens DESC;
```

### Erros

Erros de produção são enviados ao Sentry. Acesse o painel Sentry para ver stack traces e contexto completo.

---

## 7. Banco de Dados — Operações Comuns

### Adicionar nova fonte programaticamente

```sql
INSERT INTO teaching_sources (name, description, is_active)
VALUES ('Nova Fonte', 'Descrição', true);
```

### Verificar documentos com erro

```sql
SELECT id, name, status, created_at
FROM documents
WHERE status = 'error'
ORDER BY created_at DESC;
```

### Ver chunks de um documento

```sql
SELECT id, content, metadata
FROM document_chunks
WHERE document_id = 'uuid-aqui'
ORDER BY created_at;
```

### Limpar embeddings de um documento (para reprocessar)

```sql
DELETE FROM document_chunks WHERE document_id = 'uuid-aqui';
UPDATE documents SET status = 'pending' WHERE id = 'uuid-aqui';
```

---

## 8. Acesso ao Supabase

**Dashboard:** https://supabase.com/dashboard/project/zvuzkuyqeapbmfmcngae

**Conexão direta (psql):**
```bash
psql "postgresql://postgres:[senha]@db.zvuzkuyqeapbmfmcngae.supabase.co:5432/postgres"
```

**Storage:** Bucket `avatars` — imagens de avatar do sistema

---

## 9. Troubleshooting

### Documentos não aparecem na busca
1. Verificar status do documento em Admin → Documents (deve ser `indexed`)
2. Verificar se a fonte está ativa (is_active = true)
3. Verificar se o idioma do documento corresponde ao filtro de busca ('pt')
4. Tentar reprocessar o documento

### Usuário não consegue fazer login
1. Verificar se o convite foi aceito
2. Verificar se o perfil existe na tabela `profiles`
3. Verificar no Supabase Auth → Users se o usuário está ativo

### Clone Cognitivo não responde corretamente
1. Verificar os logs do Sentry para erros na rota `/api/chat/clone/stream`
2. Verificar se a chave `ANTHROPIC_API_KEY` está válida
3. Verificar rate limits (tabela `token_usage` e Upstash dashboard)

### Busca retornando resultados irrelevantes
- Os thresholds estão calibrados (0.65 para chat, 0.50 para explore)
- Se os resultados ainda são ruins, pode ser necessário reprocessar os documentos para gerar embeddings frescos
- Verificar se os documentos em português têm metadata `language: 'pt'` correto
