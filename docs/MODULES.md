# Módulos do Sistema — Sri AB Teachings SecondBrain

Descrição detalhada de todos os módulos da plataforma.

---

## 1. SecondBrain (Chat RAG)

**Rota:** `/app/chat`
**API:** `POST /api/chat/stream` (SSE) / `POST /api/chat` (non-streaming)

Chat com busca semântica estrita nos documentos indexados. Recusa responder quando não encontra contexto relevante.

**Comportamento:**
- Busca os 7 chunks mais similares à pergunta (threshold 0.65)
- Carrega as últimas 6 mensagens da conversa como histórico
- Envia contexto + histórico + pergunta ao Claude
- Cita fontes ao final da resposta (documento + data + YouTube quando disponível)
- Se nenhum chunk passa o threshold → resposta padrão de "não encontrei"

**Persistência:** Conversas e mensagens salvas em `conversations` + `messages`

---

## 2. Clone Cognitivo

**Rota:** `/app/clone`
**API:** `POST /api/chat/clone/stream` (SSE)

Chat que simula a consciência e voz de Sri Amma Bhagavan. Responde sempre, com ou sem documentos de contexto.

**Comportamento:**
- Mesmo pipeline de busca do SecondBrain (threshold 0.65, 7 chunks)
- Quando há contexto RAG: enriquece a resposta com os documentos encontrados
- Quando não há contexto: responde puramente a partir do DNA Mental (`CLONE_SYSTEM_PROMPT`)
- **Nunca** recusa responder
- Badge "DNA Mental • IA" visível no header para transparência

**DNA Mental (CLONE_SYSTEM_PROMPT):**
- 10 marcadores de voz (ex: Calor com Clareza, Rigor Intelectual, Apontar para Experiência Direta)
- 6 padrões cognitivos (ex: Problema → Análise de Consciência, Particular → Universal)
- 7 assinaturas comportamentais (ex: Escuta Profunda, Resposta Não-Defensiva)
- 15 marcadores linguísticos (ex: linguagem "Ver/Vendo", frase "O que é", vocabulário Deeksha)
- 8 regras de geração de resposta
- Anti-padrões explícitos (nunca dar conselhos práticos, nunca criar dependência)

---

## 3. Explorar (Busca Semântica)

**Rota:** `/app/explore` (ou similar)
**API:** `POST /api/search`

Busca semântica pura — sem geração de texto por IA. Retorna os chunks mais relevantes com score de similaridade.

**Comportamento:**
- Threshold mais amplo: **0.50** (descoberta)
- Retorna até 12 resultados por busca
- Deduplica por documento (mantém o chunk de maior similaridade por documento)
- Exibe % de similaridade, nome do documento, fonte e data
- Útil para navegar pelos ensinamentos sem filtro de IA

---

## 4. Mensagem Diária (Daily Teaching)

**Rota:** `/app/daily-teaching`
**API:** `POST /api/daily-message/generate/stream`

Geração de mensagens temáticas para divulgação nas redes sociais ou comunidades, baseadas nos ensinamentos.

**Subpáginas:**
- `/app/daily-teaching` — interface de geração
- `/app/daily-teaching/prompts` — gerenciar prompts customizados
- `/app/daily-teaching/settings` — configurar provider de IA e modelo

**Comportamento:**
- Usuário informa um tema (ex: "graça divina", "impotência")
- Sistema busca ensinamentos relacionados (threshold 0.55, até 20 chunks)
- Gera mensagem no idioma escolhido (PT, EN, ES) usando os ensinamentos como base
- Suporte a prompts customizados por usuário
- Fallback automático de providers: Claude → ChatGPT → Gemini

**Tabelas:** `custom_prompts`, `user_ai_settings`, `daily_messages`

---

## 5. Cursos

**Rota:** `/app/cursos`
**Subrotas:** `/app/cursos/[course]/[channel]`

Módulo de produção massiva de conteúdo para cursos específicos de Sri Amma Bhagavan.

**Cursos disponíveis:**
| Slug | Nome | Descrição |
|------|------|-----------|
| `dadiva-de-ananda` | Dádiva de Ananda | Conteúdo de divulgação e nutrição |
| `81000-deeksha-yajna` | 81000 Deeksha Yajna | Conteúdo de divulgação e nutrição |
| `becoming-higher-being` | Becoming a Higher Being | Conteúdo de divulgação e nutrição |
| `miracle-course` | Miracle Course | Conteúdo de divulgação e nutrição |

**Estrutura de navegação:**
```
/app/cursos                          → Seletor de curso (grid de cards)
/app/cursos/[course]                 → Seletor de canal/tipo de conteúdo
/app/cursos/[course]/[channel]       → Gerador de conteúdo para o canal
/app/cursos/[course]/[channel]/prompts → Gerenciar prompts do canal
```

**Uso:** Para cada curso, o usuário seleciona o canal (Instagram, WhatsApp, Email, etc.) e gera conteúdo adequado para aquele canal baseado nos ensinamentos do curso.

---

## 6. Redes Sociais (Social Media)

**Rota:** `/app/social-media`
**Subrotas:** `/app/social-media/[network]`

Módulo de geração de conteúdo para redes sociais, baseado nos ensinamentos de Sri Amma Bhagavan.

**Redes disponíveis:**
| Slug | Rede | Tipo de conteúdo |
|------|------|-----------------|
| `youtube` | YouTube | Scripts, títulos, descrições e thumbnails |
| `instagram` | Instagram | Legendas, stories, reels e carrosséis |
| `x-twitter` | X (Twitter) | Tweets, threads e posts de engajamento |
| `facebook` | Facebook | Posts, artigos e conteúdo de comunidade |
| `linkedin` | LinkedIn | Posts profissionais e thought leadership |
| `tiktok` | TikTok | Scripts de vídeo curto e conteúdo trending |
| `threads` | Threads | Posts conversacionais e discussões |
| `pinterest` | Pinterest | Descrições de pins, boards e ideias |

**Estrutura de navegação:**
```
/app/social-media                        → Seletor de rede (grid de cards)
/app/social-media/[network]              → Gerador de conteúdo para a rede
/app/social-media/[network]/prompts      → Gerenciar prompts da rede
```

---

## 7. Milagres (Miracles)

**Rota:** `/app/milagres`
**API:** `POST /api/miracles/generate/stream`

Módulo de geração de "miracles" — textos inspiracionais ou relatos de graça baseados nos ensinamentos.

**Funcionalidades:**
- Geração de miracles com streaming SSE
- Histórico de miracles gerados
- Cópias salvas (`miracle_copies`)
- Prompts customizáveis (`miracle_prompts`)
- Busca e filtragem no histórico
- Suporte a múltiplos canais de destino (YouTube, Instagram, Twitter, Facebook, LinkedIn, TikTok, Threads, Email, WhatsApp, Telegram)
- Ação de "Pin" para fixar miracles importantes

**Tabelas:** `miracles`, `miracle_copies`, `miracle_prompts`

---

## 8. Painel Admin

**Rota:** `/app/admin/*`
**Acesso:** Usuários com `role = 'admin'`

Ver [docs/ADMIN_GUIDE.md](ADMIN_GUIDE.md) para guia completo.

**Subpáginas:**
| Rota | Descrição |
|------|-----------|
| `/app/admin/documents` | Upload, gerenciamento e reprocessamento de documentos |
| `/app/admin/members` | Gerenciamento de usuários e convites |
| `/app/admin/audit` | Logs de auditoria e conteúdo sinalizado |
| `/app/admin/history` | Histórico de todas as conversas |
| `/app/admin/settings` | Branding (nome, subtítulo, avatar) e fontes de ensinamentos |

---

## Mapa de Módulos × Tabelas

| Módulo | Tabelas principais |
|--------|--------------------|
| SecondBrain / Clone | `conversations`, `messages`, `document_chunks`, `documents` |
| Explorar | `document_chunks`, `documents`, `teaching_sources` |
| Mensagem Diária | `daily_messages`, `custom_prompts`, `user_ai_settings` |
| Cursos | (usa mesma infra de geração — prompts + chunks) |
| Redes Sociais | (usa mesma infra de geração — prompts + chunks) |
| Milagres | `miracles`, `miracle_copies`, `miracle_prompts` |
| Admin | Todas as tabelas (service role) |
| Sistema | `system_settings`, `token_usage`, `usage_limits`, `audit_logs` |
