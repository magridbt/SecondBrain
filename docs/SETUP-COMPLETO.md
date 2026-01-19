# Documentacao Completa do Projeto SecondBrain-SriAmmaBhagavan

**Data de Criacao:** 16 de Janeiro de 2026
**Versao:** 1.0

---

## Indice

1. [Visao Geral do Projeto](#1-visao-geral-do-projeto)
2. [Contas e Servicos Criados](#2-contas-e-servicos-criados)
3. [Banco de Dados (Supabase)](#3-banco-de-dados-supabase)
4. [Estrutura do Codigo](#4-estrutura-do-codigo)
5. [Como Rodar o Projeto](#5-como-rodar-o-projeto)
6. [Funcionalidades Implementadas](#6-funcionalidades-implementadas)
7. [Proximos Passos](#7-proximos-passos)
8. [Custos Estimados](#8-custos-estimados)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Visao Geral do Projeto

### O que e o SecondBrain?

SecondBrain-SriAmmaBhagavan e uma plataforma de IA que permite aos devotos da comunidade Oneness fazer perguntas e receber respostas baseadas nos ensinamentos originais de Sri Amma Bhagavan.

### Como funciona?

1. **Upload de Documentos**: Admins fazem upload de PDFs/textos com ensinamentos
2. **Processamento**: O sistema quebra os documentos em pedacos e gera embeddings (vetores numericos)
3. **Busca Semantica**: Quando um usuario faz uma pergunta, o sistema busca os trechos mais relevantes
4. **Resposta com IA**: Claude (IA da Anthropic) gera uma resposta baseada nos trechos encontrados

### Stack Tecnologico

| Camada | Tecnologia | Funcao |
|--------|------------|--------|
| Frontend | Next.js 14 + React | Interface do usuario |
| Estilizacao | Tailwind CSS | Design responsivo |
| Backend | Next.js API Routes | Logica do servidor |
| Banco de Dados | Supabase (PostgreSQL) | Armazenamento |
| Vetores | pgvector | Busca semantica |
| IA | Claude API (Anthropic) | Geracao de respostas |
| Embeddings | Voyage AI | Transformar texto em vetores |
| Cache | Upstash Redis | Rate limiting |
| Autenticacao | Supabase Auth | Login/cadastro |
| Deploy | Vercel | Hospedagem |

---

## 2. Contas e Servicos Criados

### 2.1 Supabase (Banco de Dados)

- **URL do Projeto**: https://zvuzkuyqeapbmfmcngae.supabase.co
- **Funcao**: Banco de dados PostgreSQL + Autenticacao + Storage
- **Plano**: Free (pode fazer upgrade para Pro depois)

**Credenciais salvas em `.env.local`:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2.2 Anthropic (Claude API)

- **Console**: https://console.anthropic.com
- **Funcao**: IA que gera as respostas para os usuarios
- **Modelo**: Claude 3.5 Sonnet
- **Custo**: ~$3/milhao tokens input, ~$15/milhao tokens output

**Credencial:**
- `ANTHROPIC_API_KEY`

### 2.3 Voyage AI (Embeddings)

- **Site**: https://voyageai.com
- **Funcao**: Transforma texto em vetores para busca semantica
- **Plano**: Free (50M tokens/mes)

**Credencial:**
- `VOYAGE_API_KEY`

### 2.4 Upstash Redis (Rate Limiting)

- **Site**: https://upstash.com
- **Funcao**: Limitar requisicoes por usuario (protecao)
- **Database**: SecondBrain

**Credenciais:**
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### 2.5 Vercel (Deploy)

- **Site**: https://vercel.com
- **Funcao**: Hospedagem do aplicativo
- **Status**: Conta criada, ainda nao conectada ao GitHub

---

## 3. Banco de Dados (Supabase)

### 3.1 Tabelas Criadas

O script `database-setup.sql` foi executado no SQL Editor do Supabase e criou:

| Tabela | Funcao |
|--------|--------|
| `profiles` | Dados dos usuarios (nome, email, role) |
| `invites` | Convites pendentes por email |
| `teaching_sources` | Fontes dos ensinamentos (81000, Tejasaji, etc) |
| `documents` | Documentos uploadados (PDFs, textos) |
| `document_chunks` | Pedacos dos documentos com embeddings |
| `conversations` | Conversas dos usuarios |
| `messages` | Mensagens do chat |
| `feedback` | Avaliacoes das respostas (like/dislike) |
| `audit_logs` | Logs de acoes administrativas |
| `response_cache` | Cache de respostas frequentes |

### 3.2 Fontes Pre-cadastradas

Ja foram inseridas 5 fontes de ensinamentos:
1. Programa 81000 Deeksha Yajna
2. Aulas Aprofundamentos
3. Videos Kalki Dharma
4. Tejasaji
5. Outros

### 3.3 Seguranca (RLS)

Row Level Security foi ativado em todas as tabelas:
- Usuarios so veem seus proprios dados
- Admins podem ver/editar tudo
- Documentos so aparecem apos serem indexados

### 3.4 Funcoes Criadas

- `search_teachings()`: Busca semantica nos ensinamentos
- `search_response_cache()`: Busca no cache de respostas
- `handle_new_user()`: Cria profile quando usuario se cadastra
- `update_updated_at_column()`: Atualiza timestamps automaticamente
- `is_admin()`: Verifica se usuario e admin

---

## 4. Estrutura do Codigo

### 4.1 Arquivos de Configuracao

```
/
├── .env.local           # Credenciais (NAO COMPARTILHAR)
├── .env.example         # Exemplo de credenciais
├── .gitignore           # Arquivos ignorados pelo Git
├── package.json         # Dependencias do projeto
├── tsconfig.json        # Configuracao TypeScript
├── next.config.js       # Configuracao Next.js
├── tailwind.config.js   # Configuracao Tailwind CSS
├── postcss.config.js    # Configuracao PostCSS
└── middleware.ts        # Middleware de autenticacao
```

### 4.2 Codigo Fonte (src/)

```
src/
├── app/                      # App Router do Next.js
│   ├── layout.tsx           # Layout raiz (HTML, fonts)
│   ├── page.tsx             # Pagina inicial (redireciona)
│   ├── globals.css          # Estilos globais
│   │
│   ├── login/
│   │   └── page.tsx         # Pagina de login/cadastro
│   │
│   ├── invite/
│   │   └── [token]/
│   │       └── page.tsx     # Aceitar convite
│   │
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts     # API do chat (integra Claude)
│   │   └── health/
│   │       └── route.ts     # Health check
│   │
│   └── app/                  # Area logada
│       ├── layout.tsx       # Layout com sidebar
│       ├── page.tsx         # Redireciona para /chat
│       │
│       ├── chat/
│       │   └── page.tsx     # Interface do chat
│       │
│       └── admin/
│           ├── documents/
│           │   └── page.tsx # Gerenciar documentos
│           ├── members/
│           │   └── page.tsx # Gerenciar membros
│           └── settings/
│               └── page.tsx # Configuracoes
│
├── components/
│   ├── Sidebar.tsx          # Barra lateral de navegacao
│   └── ChatMessage.tsx      # Componente de mensagem
│
└── lib/
    ├── utils.ts             # Funcoes utilitarias
    └── supabase/
        ├── client.ts        # Cliente Supabase (browser)
        ├── server.ts        # Cliente Supabase (server)
        └── middleware.ts    # Middleware de sessao
```

### 4.3 Documentacao

```
docs/
├── project-brief.md     # Briefing inicial do projeto
├── prd.md              # Product Requirements Document
├── architecture.md     # Arquitetura tecnica detalhada
└── SETUP-COMPLETO.md   # Este documento
```

---

## 5. Como Rodar o Projeto

### 5.1 Pre-requisitos

- Node.js 18 ou superior
- npm ou yarn

### 5.2 Instalacao

```bash
# 1. Navegue ate a pasta do projeto
cd "/Users/lei/Documents/Magrid/CheckTools/SecondBrain/Sri Amma Bhagavan"

# 2. Instale as dependencias
npm install

# 3. Rode o servidor de desenvolvimento
npm run dev
```

### 5.3 Acessar o Aplicativo

Abra o navegador em: **http://localhost:3000**

### 5.4 Primeiro Acesso

1. Acesse http://localhost:3000/login
2. Crie uma conta com email e senha
3. Verifique o email (se configurado) ou acesse diretamente

### 5.5 Tornar Usuario Admin

Execute no SQL Editor do Supabase:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'seu-email@exemplo.com';
```

---

## 6. Funcionalidades Implementadas

### 6.1 Autenticacao

- [x] Login com email/senha
- [x] Cadastro de novos usuarios
- [x] Sistema de convites por email
- [x] Middleware de protecao de rotas
- [x] Logout

### 6.2 Chat (SecondBrain)

- [x] Interface de chat responsiva
- [x] Integracao com Claude API
- [x] Busca nos documentos (texto simples por enquanto)
- [x] Exibicao de fontes usadas na resposta
- [x] Sistema de feedback (like/dislike)
- [x] Sugestoes de perguntas iniciais

### 6.3 Admin - Documentos

- [x] Upload de arquivos PDF/TXT
- [x] Selecao de fonte do ensinamento
- [x] Lista de documentos com status
- [x] Exclusao de documentos (soft delete)
- [x] Busca por nome

### 6.4 Admin - Membros

- [x] Lista de membros cadastrados
- [x] Envio de convites por email
- [x] Alternar role (admin/member)
- [x] Lista de convites pendentes

### 6.5 Admin - Configuracoes

- [x] Gerenciar fontes de ensinamentos
- [x] Criar/editar/excluir fontes
- [x] Ativar/desativar fontes

### 6.6 Interface

- [x] Design responsivo (mobile/desktop)
- [x] Sidebar com navegacao
- [x] Cores tematicas (laranja/dourado espiritual)
- [x] Animacoes suaves
- [x] Loading states

---

## 7. Proximos Passos

### 7.1 Imediatos (Para Funcionar Completo)

1. **Instalar dependencias**: `npm install`
2. **Rodar o projeto**: `npm run dev`
3. **Criar primeiro admin**: Atualizar role no banco
4. **Configurar Storage no Supabase**: Criar bucket "documents"
5. **Upload de ensinamentos**: Fazer upload dos PDFs

### 7.2 Funcionalidades Pendentes

1. **Processamento de PDFs**
   - Extrair texto dos PDFs
   - Quebrar em chunks
   - Gerar embeddings com Voyage AI
   - Salvar no banco

2. **Busca Semantica**
   - Implementar busca por similaridade de vetores
   - Substituir busca de texto atual

3. **Rate Limiting**
   - Integrar Upstash Redis
   - Limitar requisicoes por usuario

4. **Email de Convites**
   - Integrar Resend para envio de emails
   - Template de email de convite

5. **Deploy**
   - Conectar Vercel ao GitHub
   - Configurar variaveis de ambiente
   - Fazer primeiro deploy

---

## 8. Custos Estimados

### 8.1 Fase de Desenvolvimento (Agora)

| Servico | Custo |
|---------|-------|
| Supabase | Gratis |
| Claude API | ~$5-10 |
| Voyage AI | Gratis |
| Upstash | Gratis |
| Vercel | Gratis |
| **Total** | **~$5-10** |

### 8.2 Producao (100+ usuarios)

| Servico | Custo/mes |
|---------|-----------|
| Supabase Pro | $25 |
| Claude API | $30-50 |
| Voyage AI | $5-10 |
| Upstash | $10 |
| Vercel | Gratis |
| **Total** | **~$70-95/mes** |

---

## 9. Troubleshooting

### Erro: "Module not found"

```bash
npm install
```

### Erro: "Unauthorized" no login

Verifique se as credenciais do Supabase estao corretas no `.env.local`

### Erro: "Rate limit exceeded" no Claude

Aguarde alguns minutos ou verifique seu saldo na Anthropic

### Chat nao encontra documentos

Os documentos precisam ter status "indexed". Por enquanto, como nao temos o processamento de embeddings, a busca e limitada.

### Nao consigo acessar area admin

Atualize seu role para "admin" no banco de dados:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'seu@email.com';
```

---

## Historico de Alteracoes

| Data | Descricao |
|------|-----------|
| 2026-01-15 | Criacao do Project Brief |
| 2026-01-15 | Criacao do PRD |
| 2026-01-15 | Criacao da Arquitetura |
| 2026-01-15 | Review da Arquitetura (v1.1) |
| 2026-01-16 | Criacao das contas (Supabase, Anthropic, Voyage, Upstash, Vercel) |
| 2026-01-16 | Configuracao do banco de dados |
| 2026-01-16 | Criacao do codigo do projeto |
| 2026-01-16 | Criacao desta documentacao |

---

*Documento criado com assistencia do Claude Code*
