# Project Brief: SecondBrain-SriAmmaBhagavan

**Versão:** 1.0
**Data:** 2026-01-15
**Autor:** Atlas (Business Analyst) + Stakeholder

---

## 1. Executive Summary

**SecondBrain-SriAmmaBhagavan** é uma mente sintética (agente de IA) alimentada por mais de 5 anos de ensinamentos originais de Sri Amma Bhagavan. O produto atende a comunidade Oneness globalmente, fornecendo respostas autênticas baseadas nos ensinamentos originais, auxiliando líderes e facilitadores a responder centenas de devotos e criar conteúdo espiritual em escala massiva.

---

## 2. Problem Statement

### Estado Atual
- Líderes e facilitadores da comunidade Oneness recebem centenas de perguntas de devotos diariamente
- Responder cada pessoa individualmente consome tempo excessivo
- A criação de conteúdo (posts, vídeos, textos) requer consulta manual a anos de materiais
- Devotos em diferentes países e fusos horários precisam de respostas, mas não há disponibilidade 24/7
- Risco de interpretações pessoais se afastarem dos ensinamentos originais

### Impacto
- Devotos ficam sem resposta ou esperam muito tempo
- Conteúdo produzido é limitado pela capacidade humana
- Crescimento da comunidade global é restringido

### Por que soluções existentes falham
- ChatGPT genérico não conhece os ensinamentos específicos de Sri Amma Bhagavan
- Buscas manuais em 5+ anos de material são ineficientes
- Não há fonte centralizada e autêntica para consulta

---

## 3. Proposed Solution

Um **agente de IA especializado** que:

1. **Ingere e indexa** todos os ensinamentos originais de Sri Amma Bhagavan (5+ anos de materiais)
2. **Responde perguntas** trazendo citações e ensinamentos originais, não interpretações
3. **Suporta múltiplos idiomas** para atender devotos globalmente
4. **Escala horizontalmente** para 100+ usuários simultâneos
5. **Atualiza continuamente** com novos ensinamentos mensais

**Diferencial:** Respostas sempre ancoradas em ensinamentos **originais e verificáveis**, não em interpretações de IA genérica.

---

## 4. Target Users

### Segmento Primário: Facilitadores e Líderes Oneness

| Aspecto | Descrição |
|---------|-----------|
| **Perfil** | Líderes de comunidades Oneness, facilitadores de cursos, guias espirituais |
| **Comportamento atual** | Respondem perguntas manualmente, consultam materiais físicos/digitais |
| **Dores** | Tempo limitado, volume alto de perguntas, dificuldade em criar conteúdo |
| **Objetivo** | Atender mais pessoas com qualidade, manter autenticidade dos ensinamentos |

### Segmento Secundário: Devotos da Comunidade Oneness

| Aspecto | Descrição |
|---------|-----------|
| **Perfil** | Praticantes em diversos países (Brasil, Índia, EUA, Europa, etc.) |
| **Comportamento atual** | Fazem perguntas a facilitadores, buscam em grupos |
| **Dores** | Esperam por respostas, dificuldade de acesso a materiais originais |
| **Objetivo** | Receber orientação autêntica baseada nos ensinamentos |

---

## 5. Goals & Success Metrics

### Business Objectives
- Reduzir tempo de resposta a devotos em 80%
- Aumentar volume de conteúdo produzido em 5x
- Expandir alcance para 10+ países no primeiro ano

### User Success Metrics
- Satisfação dos devotos com respostas (NPS > 8)
- Taxa de respostas consideradas "autênticas" pelos facilitadores (> 90%)
- Tempo médio para obter resposta < 30 segundos

### Key Performance Indicators (KPIs)
- **Usuários ativos diários:** Meta de 100+ simultâneos
- **Perguntas respondidas/dia:** Meta de 500+
- **Taxa de citação de fonte original:** > 95% das respostas
- **Uptime:** 99.5%

---

## 6. MVP Scope

### Core Features (Must Have)
- **Ingestão de documentos:** Upload e processamento de materiais (PDFs, textos, áudios transcritos)
- **RAG (Retrieval-Augmented Generation):** Busca semântica nos ensinamentos + geração de resposta
- **Interface de chat:** Perguntar e receber respostas com citações das fontes
- **Multi-idioma:** Português e Inglês no MVP
- **Autenticação básica:** Controle de acesso para a comunidade

### Out of Scope for MVP
- App mobile nativo (usar web responsivo)
- Geração de vídeo/áudio automático
- Integração com WhatsApp/Telegram
- Tradução automática para todos os idiomas
- Dashboard de analytics avançado

### MVP Success Criteria
- 50 usuários conseguem fazer perguntas simultaneamente
- Respostas incluem citação da fonte original em 90%+ dos casos
- Facilitadores validam que respostas são fiéis aos ensinamentos

---

## 7. Post-MVP Vision

### Phase 2 Features
- Suporte a mais idiomas (Espanhol, Hindi, etc.)
- Integração com WhatsApp Business API
- Modo de criação de conteúdo (gerar posts, scripts)
- Dashboard para facilitadores verem perguntas frequentes

### Long-term Vision
- Plataforma completa de conhecimento Oneness
- Cursos interativos guiados pelo agente
- Comunidade global conectada através do Second Brain

### Expansion Opportunities
- Licenciamento para outras comunidades espirituais
- API para integrações de terceiros
- App mobile dedicado

---

## 8. Technical Considerations

### Formato dos Materiais
- **PDFs:** Prontos para ingestão
- **Áudios:** Precisam transcrição (Whisper API)
- **Vídeos:** Precisam transcrição (extrair áudio → Whisper)
- **Transcrições existentes:** Algumas já disponíveis, mais serão adicionadas

### Stack Técnico Definido

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│         Next.js (React) + Tailwind CSS              │
│              Web Responsivo                         │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                   BACKEND                           │
│              Supabase (BaaS)                        │
│   • Auth (autenticação de usuários)                 │
│   • PostgreSQL + pgvector (busca semântica)         │
│   • Storage (arquivos PDF, áudios)                  │
│   • Edge Functions (APIs serverless)                │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                     IA/LLM                          │
│              Claude API (Anthropic)                 │
│   • Geração de respostas                            │
│   • Embeddings via Voyage AI ou similar             │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│               TRANSCRIÇÃO                           │
│         OpenAI Whisper API ou local                 │
│   • Converter áudios/vídeos → texto                 │
└─────────────────────────────────────────────────────┘
```

### Justificativa da Stack
- **Supabase:** Open source, custo controlado, pgvector nativo para RAG
- **Claude:** Conta existente, excelente para textos longos e nuances espirituais
- **Next.js:** Deploy fácil na Vercel, SSR para SEO, ótima DX

### Platform Requirements
- **Target Platforms:** Web responsivo (desktop e mobile)
- **Browser Support:** Chrome, Safari, Firefox, Edge (últimas 2 versões)
- **Performance:** Resposta em < 5 segundos, 100+ usuários simultâneos

### Architecture Considerations
- **Repository:** Monorepo
- **Service Architecture:** Serverless (para escalar com demanda)
- **Vector Database:** pgvector no Supabase para busca semântica
- **Storage:** Supabase Storage para arquivos de ensinamentos

---

## 9. Constraints & Assumptions

### Constraints

| Tipo | Descrição |
|------|-----------|
| **Budget** | Contas existentes (Claude), Supabase free tier inicial |
| **Timeline** | A definir |
| **Resources** | Stakeholder principal + comunidade de devotos para curadoria |
| **Technical** | Transcrição de áudios/vídeos como etapa inicial necessária |

### Key Assumptions
- Materiais em formato digital (PDF, áudio, vídeo)
- Permissão para uso dos ensinamentos neste formato
- Stakeholder e devotos farão validação/curadoria das respostas
- Algumas transcrições já existem, resto será feito
- A comunidade Oneness adotará a ferramenta
- Conexão de internet dos usuários é suficiente para uso web

---

## 10. Risks & Open Questions

### Key Risks

| Risco | Descrição | Impacto |
|-------|-----------|---------|
| **Qualidade das respostas** | IA pode interpretar incorretamente ensinamentos sensíveis | Alto |
| **Escalabilidade** | 100+ usuários simultâneos requer infraestrutura robusta | Médio |
| **Custo de API** | Uso intensivo de LLM pode gerar custos altos | Médio |
| **Dependência de plataforma** | Mudanças em APIs de terceiros (Claude, Supabase) | Baixo |

### Open Questions
- Qual o volume exato de materiais? (horas de áudio/vídeo, quantidade de PDFs)
- Qual o orçamento mensal disponível para infraestrutura?
- Há preferência de hospedagem (Vercel, AWS, etc.)?

### Areas Needing Further Research
- Benchmark de soluções RAG para este volume
- Custos comparativos entre provedores de embeddings
- Estratégia de moderação de conteúdo

---

## 11. Next Steps

1. ✅ ~~Definir stack técnico~~ → **Claude + Supabase + Next.js**
2. ✅ ~~Definir formato dos materiais~~ → **PDF, áudio, vídeo**
3. 📋 **Criar PRD detalhado** com @pm (Morgan)
4. 🏗️ **Definir arquitetura** com @architect (Aria)
5. 🎯 **Inventariar materiais** (quantos PDFs, horas de áudio/vídeo)
6. 🔧 **Configurar ambiente** (Supabase, repositório Git)

---

## PM Handoff

Este Project Brief fornece o contexto completo para **SecondBrain-SriAmmaBhagavan**.

**Para o PM (Morgan):** Inicie o modo de criação de PRD, revise este briefing e trabalhe com o usuário para criar os requisitos funcionais, épicos e histórias.

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-01-15 | 1.0 | Versão inicial do Project Brief | Atlas + Stakeholder |

---

*Documento gerado com Synkra AIOS - Atlas (Business Analyst)*
