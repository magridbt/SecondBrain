# Product Requirements Document (PRD)
## SecondBrain-SriAmmaBhagavan

**Versão:** 1.0
**Data:** 2026-01-15
**Status:** Draft

---

## 1. Goals

- Criar uma plataforma modular All-in-One para a comunidade Oneness
- O primeiro módulo (SecondBrain) responde perguntas com base nos ensinamentos originais de Sri Amma Bhagavan
- Reduzir em 80% o tempo de resposta aos devotos
- Aumentar em 5x a capacidade de criação de conteúdo espiritual
- Atender 100+ usuários simultâneos globalmente
- Manter 95%+ das respostas com citação de fonte original
- Arquitetura modular preparada para futuros módulos (Social Media, etc.)

---

## 2. Background Context

A comunidade Oneness possui mais de 5 anos de ensinamentos de Sri Amma Bhagavan em diversos formatos (PDFs, áudios, vídeos). Atualmente, facilitadores e líderes respondem manualmente centenas de perguntas de devotos ao redor do mundo, processo que consome tempo excessivo e limita o crescimento da comunidade.

A visão é criar uma **plataforma All-in-One** onde o SecondBrain é o primeiro módulo, com futura expansão para Social Media manager e outras ferramentas. O acesso inicial será restrito à comunidade (convite por email), expandindo para o público após validação.

**Fontes dos Ensinamentos:**
Os materiais vêm de diversas fontes que precisam ser catalogadas:
- Programa 81000 Deeksha Yajna
- Aulas Aprofundamentos
- Videos Kalki Dharma
- Tejasaji
- E outras fontes a serem adicionadas

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-01-15 | 1.0 | Versão inicial | Morgan + Stakeholder |

---

## 3. Requirements

### 3.1 Functional Requirements

#### Platform Core
| ID | Requisito |
|----|-----------|
| **FR1** | O sistema deve ter sidebar de navegação entre módulos |
| **FR2** | O sistema deve suportar ativação/desativação de módulos |
| **FR3** | O sistema deve ter sistema de convite por email para novos membros |
| **FR4** | Administradores podem enviar convites e gerenciar membros |
| **FR5** | O sistema deve ser preparado para adicionar novos módulos sem refatoração |

#### SecondBrain Module
| ID | Requisito |
|----|-----------|
| **FR6** | O sistema deve permitir upload de documentos PDF para a base de conhecimento |
| **FR7** | O sistema deve processar e indexar transcrições de áudio/vídeo |
| **FR8** | O sistema deve categorizar documentos por fonte de ensinamento |
| **FR9** | O sistema deve realizar busca semântica nos ensinamentos indexados |
| **FR10** | O sistema deve gerar respostas usando Claude API com contexto dos ensinamentos |
| **FR11** | O sistema deve incluir citação da fonte original em cada resposta (documento + fonte de ensinamento) |
| **FR12** | O sistema deve suportar interface de chat em Português e Inglês |
| **FR13** | O sistema deve permitir que administradores adicionem novos documentos mensalmente |
| **FR14** | O sistema deve manter histórico de conversas por usuário |
| **FR15** | O sistema deve permitir feedback dos usuários sobre qualidade das respostas |
| **FR16** | Administradores podem gerenciar as fontes de ensinamento (adicionar, editar, desativar) |

### 3.2 Non-Functional Requirements

| ID | Requisito |
|----|-----------|
| **NFR1** | O sistema deve suportar 100+ usuários simultâneos |
| **NFR2** | O tempo de resposta deve ser inferior a 5 segundos |
| **NFR3** | O sistema deve ter uptime de 99.5% |
| **NFR4** | A interface deve ser responsiva (desktop e mobile) |
| **NFR5** | Os dados dos usuários devem ser protegidos com criptografia |
| **NFR6** | O sistema deve funcionar nos navegadores Chrome, Safari, Firefox e Edge |
| **NFR7** | O custo de infraestrutura deve ser otimizado usando free tiers quando possível |
| **NFR8** | A arquitetura deve ser modular para facilitar adição de novos módulos |

---

## 4. User Interface Design Goals

### 4.1 Overall UX Vision

Plataforma modular com sidebar de navegação à esquerda e área de conteúdo principal. Visual minimalista e sereno que reflita a natureza espiritual do conteúdo.

```
┌─────────────────────────────────────────────────────────────┐
│  Logo    SecondBrain-SriAmmaBhagavan          [User] [Lang] │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│  MODULES    │              CONTENT AREA                     │
│             │                                               │
│ ┌─────────┐ │                                               │
│ │   🧠    │ │     Área do módulo ativo                      │
│ │ Second  │◄│     (SecondBrain: Chat)                       │
│ │ Brain   │ │                                               │
│ └─────────┘ │                                               │
│             │                                               │
│ ┌─────────┐ │                                               │
│ │   📱    │ │                                               │
│ │ Social  │ │                                               │
│ │ (Soon)  │ │                                               │
│ └─────────┘ │                                               │
│             │                                               │
│ ─────────── │                                               │
│ ┌─────────┐ │                                               │
│ │   ⚙️    │ │                                               │
│ │ Admin   │ │                                               │
│ └─────────┘ │                                               │
│             │                                               │
└─────────────┴───────────────────────────────────────────────┘
```

### 4.2 Key Interaction Paradigms
- **Navegação por sidebar:** Módulos listados verticalmente
- **Chat conversacional:** Interação principal no SecondBrain
- **Citações destacadas:** Ensinamentos originais visualmente diferenciados com fonte
- **Feedback inline:** Botões de like/dislike em cada resposta

### 4.3 Core Screens and Views
1. **Tela de Login** - Autenticação (apenas convidados)
2. **Aceitar Convite** - Tela para criar conta a partir de convite
3. **Platform Shell** - Layout base com sidebar
4. **SecondBrain: Chat** - Interface de conversa com o agente
5. **SecondBrain: Histórico** - Lista de conversas anteriores
6. **Admin: Membros** - Gerenciar convites e membros
7. **Admin: Fontes** - Gerenciar fontes de ensinamento
8. **Admin: Upload** - Adicionar novos documentos (com seleção de fonte)

### 4.4 Accessibility
WCAG AA - Contraste adequado, navegação por teclado, textos legíveis

### 4.5 Branding
Visual limpo, cores neutras/espirituais (branco, dourado suave, azul sereno). Sem excesso de elementos visuais.

### 4.6 Target Platforms
Web Responsivo (desktop e mobile)

---

## 5. Technical Assumptions

### 5.1 Repository Structure
**Monorepo** - Frontend e backend no mesmo repositório

### 5.2 Service Architecture
**Serverless + Modular** - Supabase Edge Functions + Vercel, estrutura preparada para múltiplos módulos

### 5.3 Module Architecture
```
/src
  /modules
    /secondbrain      # Módulo SecondBrain
      /components
      /hooks
      /api
    /social-media     # Futuro módulo Social Media
    /shared           # Componentes compartilhados
  /core
    /auth             # Sistema de autenticação
    /layout           # Shell da plataforma (sidebar, header)
    /invite           # Sistema de convites
```

### 5.4 Database Schema

```sql
-- Fontes de Ensinamento
CREATE TABLE teaching_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,           -- Ex: "Programa 81000 Deeksha Yajna"
  description TEXT,                      -- Descrição da fonte
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fontes iniciais
INSERT INTO teaching_sources (name, description) VALUES
  ('Programa 81000 Deeksha Yajna', 'Ensinamentos do programa 81000'),
  ('Aulas Aprofundamentos', 'Aulas de aprofundamento espiritual'),
  ('Videos Kalki Dharma', 'Vídeos do Kalki Dharma'),
  ('Tejasaji', 'Ensinamentos de Tejasaji'),
  ('Outros', 'Outras fontes diversas');

-- Documentos
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,            -- 'pdf', 'transcript'
  source_id UUID REFERENCES teaching_sources(id),  -- << FONTE DO ENSINAMENTO
  original_filename VARCHAR(255),
  storage_path VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pending', -- pending, processed, indexed, error
  uploaded_by UUID REFERENCES profiles(id),
  metadata JSONB,                        -- data do ensinamento, evento, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chunks de documentos
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536),               -- pgvector
  chunk_index INTEGER,
  metadata JSONB,                        -- página, seção, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Perfis de usuários
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member',    -- admin, member
  created_at TIMESTAMP DEFAULT NOW()
);

-- Convites
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  invited_by UUID REFERENCES profiles(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversas
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  module VARCHAR(50) DEFAULT 'secondbrain',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mensagens
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,            -- 'user', 'assistant'
  content TEXT NOT NULL,
  sources JSONB,                         -- citações usadas na resposta
  created_at TIMESTAMP DEFAULT NOW()
);

-- Feedback
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  rating VARCHAR(20),                    -- 'like', 'dislike'
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.5 Testing Requirements
- Unit tests para funções críticas
- Integration tests para fluxo de RAG
- E2E tests para fluxos principais do usuário

### 5.6 Additional Technical Assumptions
- Claude API para geração de respostas
- Embeddings via Voyage AI ou OpenAI
- pgvector no Supabase para armazenamento de vetores
- Whisper API para transcrição de áudios/vídeos
- Supabase Auth para autenticação
- Supabase Storage para arquivos originais
- Sistema de convite por email (Resend ou similar)

---

## 6. Access Control Strategy

### Fase 1: Comunidade Fechada (MVP)
- Acesso apenas por convite
- Admin envia email com link único
- Convidado cria conta através do link
- Convites expiram em 7 dias

### Fase 2: Público (Pós-validação)
- Registro aberto
- Possível freemium ou totalmente gratuito
- A definir após feedback da comunidade

### Roles e Permissões
| Role | Permissões |
|------|------------|
| **Admin** | Tudo: convites, upload de docs, gerenciar fontes e membros |
| **Member** | Usar SecondBrain, dar feedback |
| **Pending** | Convite enviado, aguardando aceite |

---

## 7. Epic List

| Epic | Título | Objetivo |
|------|--------|----------|
| **Epic 1** | Platform Foundation | Estrutura base, autenticação e sistema de convites |
| **Epic 2** | SecondBrain: Knowledge Ingestion | Pipeline para ingestão e indexação de documentos |
| **Epic 3** | SecondBrain: RAG & Responses | Busca semântica e geração de respostas com Claude |
| **Epic 4** | Production Readiness | Multi-idioma, otimização e preparação para escala |

---

## 8. Epic Details

---

### Epic 1: Platform Foundation

**Objetivo:** Estabelecer a estrutura base da plataforma modular com autenticação por convite e shell de navegação. Ao final, membros convidados podem acessar a plataforma.

---

#### Story 1.1: Project Setup & Repository

**Como** desenvolvedor,
**Quero** um projeto Next.js configurado com arquitetura modular,
**Para que** tenhamos a base técnica para desenvolvimento.

**Acceptance Criteria:**
1. Repositório Git inicializado com estrutura monorepo
2. Next.js 14+ configurado com TypeScript e Tailwind CSS
3. Estrutura de pastas modular (/modules, /core, /shared)
4. Supabase project criado e conectado
5. Variáveis de ambiente configuradas (.env.local)
6. README com instruções de setup local
7. Deploy inicial na Vercel funcionando

---

#### Story 1.2: Database Schema & Migrations

**Como** desenvolvedor,
**Quero** o schema do banco de dados criado,
**Para que** os dados sejam persistidos corretamente.

**Acceptance Criteria:**
1. Tabela `teaching_sources` para fontes de ensinamento
2. Fontes iniciais populadas (81000, Aprofundamentos, Kalki Dharma, Tejasaji, Outros)
3. Tabela `profiles` com campo role
4. Tabela `invites` para sistema de convites
5. Tabela `documents` com campo `source_id` referenciando teaching_sources
6. Tabela `document_chunks` com suporte a pgvector
7. Tabelas `conversations`, `messages`, `feedback`
8. Row Level Security (RLS) configurado
9. Migrations criadas e versionadas

---

#### Story 1.3: Invite System Backend

**Como** administrador,
**Quero** enviar convites por email,
**Para que** novos membros possam acessar a plataforma.

**Acceptance Criteria:**
1. Edge Function para criar convite (gera token único)
2. Edge Function para validar token de convite
3. Integração com serviço de email (Resend)
4. Template de email de convite (bonito e profissional)
5. Convites expiram em 7 dias
6. Não permitir convite duplicado para mesmo email
7. Registro de quem convidou quem

---

#### Story 1.4: Authentication Flow

**Como** usuário convidado,
**Quero** criar minha conta através do convite,
**Para que** eu possa acessar a plataforma.

**Acceptance Criteria:**
1. Página de aceitar convite (/invite/[token])
2. Validação do token (válido, não expirado, não usado)
3. Formulário para criar senha
4. Conta criada automaticamente com email do convite
5. Convite marcado como aceito
6. Redirecionamento para plataforma após criação
7. Página de login para membros existentes
8. Mensagem clara se convite inválido/expirado

---

#### Story 1.5: Platform Shell & Sidebar

**Como** usuário autenticado,
**Quero** ver a plataforma com navegação lateral,
**Para que** eu possa acessar os módulos.

**Acceptance Criteria:**
1. Layout responsivo com sidebar colapsável
2. Header com logo, nome do usuário e seletor de idioma
3. Sidebar com lista de módulos disponíveis
4. Módulo ativo destacado visualmente
5. Área de conteúdo principal dinâmica
6. Módulos futuros mostrados como "Em breve"
7. Área admin visível apenas para admins
8. Logout funcional

---

#### Story 1.6: Admin - Member Management

**Como** administrador,
**Quero** gerenciar membros e convites,
**Para que** eu controle quem acessa a plataforma.

**Acceptance Criteria:**
1. Página admin de membros (/admin/members)
2. Lista de membros atuais (nome, email, data de entrada)
3. Lista de convites pendentes (email, enviado em, expira em)
4. Formulário para enviar novo convite
5. Botão para reenviar convite
6. Botão para cancelar convite pendente
7. Possibilidade de remover membro (soft delete)

---

#### Story 1.7: Admin - Teaching Sources Management

**Como** administrador,
**Quero** gerenciar as fontes de ensinamento,
**Para que** eu possa categorizar os documentos corretamente.

**Acceptance Criteria:**
1. Página admin de fontes (/admin/sources)
2. Lista de fontes existentes (nome, descrição, status)
3. Formulário para adicionar nova fonte
4. Editar fonte existente (nome, descrição)
5. Desativar/reativar fonte (não deletar para manter histórico)
6. Contador de documentos por fonte

---

### Epic 2: SecondBrain - Knowledge Ingestion

**Objetivo:** Criar sistema para upload, processamento e indexação dos ensinamentos com categorização por fonte.

---

#### Story 2.1: Document Upload Interface

**Como** administrador,
**Quero** fazer upload de PDFs com categorização,
**Para que** os ensinamentos sejam organizados por fonte.

**Acceptance Criteria:**
1. Página de upload no módulo admin (/admin/documents)
2. **Dropdown para selecionar fonte de ensinamento** (obrigatório)
3. Componente de drag-and-drop para arquivos
4. Suporte a PDF e arquivos de texto (.txt, .md)
5. Campo opcional para data do ensinamento
6. Campo opcional para descrição/notas
7. Barra de progresso de upload
8. Arquivos salvos no Supabase Storage
9. Registro na tabela `documents` com `source_id`
10. Lista de documentos com filtro por fonte

---

#### Story 2.2: PDF Text Extraction

**Como** sistema,
**Quero** extrair texto dos PDFs uploadados,
**Para que** o conteúdo seja processável.

**Acceptance Criteria:**
1. Edge Function trigger após upload
2. Extração de texto usando pdf-parse
3. Divisão em chunks de ~500-1000 tokens
4. Overlap de 100 tokens entre chunks
5. Metadados: documento origem, fonte, página, posição
6. Chunks salvos em `document_chunks`
7. Status do documento atualizado para "processed"
8. Tratamento de erros (PDF corrompido, etc.)

---

#### Story 2.3: Transcription Upload

**Como** administrador,
**Quero** adicionar transcrições de áudio/vídeo,
**Para que** todo conteúdo seja indexado.

**Acceptance Criteria:**
1. Opção de upload de transcrição (.txt, .md)
2. **Dropdown para selecionar fonte de ensinamento**
3. Campo para título do conteúdo original
4. Campo para tipo (áudio/vídeo)
5. Campo para data/evento do ensinamento
6. Processamento igual aos PDFs (chunking)
7. Metadados preservados para citação

---

#### Story 2.4: Vector Embeddings Generation

**Como** sistema,
**Quero** gerar embeddings dos chunks de texto,
**Para que** a busca semântica seja possível.

**Acceptance Criteria:**
1. Edge Function para gerar embeddings
2. Integração com API de embeddings (Voyage AI ou OpenAI)
3. Processamento em batch (eficiência)
4. Embedding salvo na coluna `embedding` (pgvector)
5. Índice vetorial criado (ivfflat ou hnsw)
6. Status do documento atualizado para "indexed"
7. Retry automático em caso de falha
8. Log de custos de API

---

### Epic 3: SecondBrain - RAG & Responses

**Objetivo:** Implementar busca semântica e geração de respostas com Claude, incluindo citação da fonte de ensinamento.

---

#### Story 3.1: Chat Interface

**Como** membro,
**Quero** uma interface de chat no SecondBrain,
**Para que** eu possa fazer perguntas.

**Acceptance Criteria:**
1. Módulo SecondBrain com interface de chat
2. Campo de input para digitar pergunta
3. Lista de mensagens (usuário e assistente)
4. Indicador de "digitando" enquanto processa
5. Auto-scroll para última mensagem
6. Botão de nova conversa
7. Design sereno e espiritual

---

#### Story 3.2: Semantic Search

**Como** sistema,
**Quero** buscar chunks relevantes para uma pergunta,
**Para que** o contexto correto seja encontrado.

**Acceptance Criteria:**
1. Função que recebe pergunta e retorna chunks
2. Embedding da pergunta gerado
3. Busca por similaridade coseno no pgvector
4. Retorno dos top 5-10 chunks mais relevantes
5. **Incluir informação da fonte de ensinamento nos resultados**
6. Score de relevância incluído
7. Tempo de busca < 1 segundo
8. Fallback se nenhum chunk relevante

---

#### Story 3.3: Claude Integration & RAG Pipeline

**Como** membro,
**Quero** receber respostas baseadas nos ensinamentos,
**Para que** minhas perguntas sejam respondidas.

**Acceptance Criteria:**
1. Edge Function para chamadas ao Claude
2. System prompt definido (contexto espiritual, tom)
3. Chunks relevantes incluídos como contexto
4. **Instrução para citar fonte de ensinamento (ex: "81000 Deeksha Yajna")**
5. Streaming de resposta para UX fluida
6. Resposta salva na tabela `messages`
7. Tempo total < 5 segundos
8. Tratamento de rate limits

---

#### Story 3.4: Source Citations Display

**Como** membro,
**Quero** ver a fonte de cada ensinamento citado,
**Para que** eu confie na autenticidade e saiba a origem.

**Acceptance Criteria:**
1. Citações em bloco destacado visualmente
2. **Nome da fonte de ensinamento exibido** (ex: "81000 Deeksha Yajna")
3. Nome do documento fonte
4. Indicação de página/seção quando disponível
5. Ícone indicando "Ensinamento Original"
6. Formatação clara (quote style)
7. Múltiplas citações suportadas (podem ser de fontes diferentes)

**Exemplo de citação:**
```
┌────────────────────────────────────────────────────────┐
│ 📖 Ensinamento Original                                │
│ Fonte: Programa 81000 Deeksha Yajna                    │
│ Documento: aula-21-transformacao.pdf (pág. 15)         │
│                                                        │
│ "O sofrimento acontece quando há resistência ao que    │
│ é. A aceitação total é o caminho para a libertação."   │
└────────────────────────────────────────────────────────┘
```

---

#### Story 3.5: Conversation History

**Como** membro,
**Quero** ver minhas conversas anteriores,
**Para que** eu possa continuar ou revisar.

**Acceptance Criteria:**
1. Lista de conversas na sidebar do módulo
2. Título automático (primeira pergunta)
3. Data da última mensagem
4. Carregar conversa ao clicar
5. Botão de nova conversa
6. Opção de deletar conversa

---

### Epic 4: Production Readiness

**Objetivo:** Preparar o sistema para uso real com multi-idioma, feedback e otimizações.

---

#### Story 4.1: Multi-language Support

**Como** membro internacional,
**Quero** usar o sistema em Inglês,
**Para que** eu entenda a interface.

**Acceptance Criteria:**
1. Sistema i18n implementado (next-intl)
2. Interface em Português (padrão) e Inglês
3. Seletor de idioma no header
4. Preferência salva por usuário
5. Respostas do Claude no idioma selecionado

---

#### Story 4.2: Response Feedback

**Como** membro,
**Quero** avaliar as respostas,
**Para que** a qualidade seja monitorada.

**Acceptance Criteria:**
1. Botões like/dislike em cada resposta
2. Modal opcional para feedback detalhado
3. Dados salvos em tabela `feedback`
4. Dashboard básico para admin ver feedback

---

#### Story 4.3: Performance Optimization

**Como** membro,
**Quero** respostas rápidas,
**Para que** a experiência seja fluida.

**Acceptance Criteria:**
1. Cache de embeddings frequentes
2. Connection pooling no Supabase
3. Índice pgvector otimizado
4. Lazy loading de histórico
5. Métricas de performance (p95 < 5s)

---

#### Story 4.4: Error Handling & Monitoring

**Como** administrador,
**Quero** monitorar erros e uso,
**Para que** eu possa manter o sistema saudável.

**Acceptance Criteria:**
1. Tratamento gracioso de erros (mensagens amigáveis)
2. Logging de erros (Supabase ou serviço externo)
3. Dashboard básico de uso (perguntas/dia)
4. Alerta se API credits baixos
5. Página de status para usuários

---

## 9. Teaching Sources (Fontes de Ensinamento)

### Fontes Iniciais Cadastradas

| ID | Nome | Descrição |
|----|------|-----------|
| 1 | Programa 81000 Deeksha Yajna | Ensinamentos do programa 81000 |
| 2 | Aulas Aprofundamentos | Aulas de aprofundamento espiritual |
| 3 | Videos Kalki Dharma | Vídeos do Kalki Dharma |
| 4 | Tejasaji | Ensinamentos de Tejasaji |
| 5 | Outros | Outras fontes diversas |

### Fluxo de Categorização

```
Upload de Documento
       │
       ▼
┌──────────────────────┐
│ Selecionar Fonte:    │
│ ○ 81000 Deeksha      │
│ ○ Aprofundamentos    │
│ ○ Kalki Dharma       │
│ ○ Tejasaji           │
│ ○ Outros             │
│ + Adicionar nova...  │
└──────────────────────┘
       │
       ▼
  Documento salvo
  com source_id
       │
       ▼
  Citações incluem
  nome da fonte
```

---

## 10. Future Modules (Roadmap)

### Social Media Module (Fase 2)
- Geração de posts para redes sociais baseado nos ensinamentos
- Templates para diferentes plataformas
- Agendamento de publicações
- Banco de imagens/citações

### Analytics Module (Fase 3)
- Dashboard de perguntas frequentes
- Insights sobre a comunidade
- Métricas de engajamento
- **Análise por fonte de ensinamento** (quais são mais consultadas)

---

## 11. Next Steps

### UX Expert Prompt
> Revise o PRD do SecondBrain-SriAmmaBhagavan e crie wireframes para: Platform Shell com sidebar, fluxo de convite/onboarding, interface de chat do SecondBrain com citações de fonte, área admin (membros, fontes, upload). Foco em experiência serena e modular.

### Architect Prompt
> Revise o PRD do SecondBrain-SriAmmaBhagavan e crie o documento de Arquitetura técnica detalhando: estrutura modular do código, schema do banco (incluindo teaching_sources), fluxo de RAG com citação de fontes, sistema de convites, e infraestrutura Supabase/Vercel.

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-01-15 | 1.0 | Versão inicial com arquitetura modular, sistema de convites e categorização por fonte de ensinamento | Morgan + Stakeholder |

---

*Documento gerado com Synkra AIOS - Morgan (Product Manager)*
