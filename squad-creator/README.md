# Squad Creator

> **Crie squads de alta qualidade baseados em elite minds reais.**

## Links Rápidos

### Para Iniciantes
| Doc | Descrição |
|-----|-----------|
| [FAQ](docs/FAQ.md) | Perguntas frequentes e glossário |
| [TUTORIAL-COMPLETO](docs/TUTORIAL-COMPLETO.md) | Exemplo real passo a passo |
| [QUICK-START](docs/QUICK-START.md) | Crie seu primeiro squad em 5 minutos |

### Referência
| Doc | Descrição |
|-----|-----------|
| [CONCEPTS](docs/CONCEPTS.md) | Entenda DNA, Tiers, Quality Gates |
| [COMMANDS](docs/COMMANDS.md) | Referência de todos os comandos |
| [TROUBLESHOOTING](docs/TROUBLESHOOTING.md) | Problemas comuns e soluções |
| [ARCHITECTURE](docs/ARCHITECTURE-DIAGRAMS.md) | Diagramas de fluxo (Mermaid) |
| [HITL-FLOW](docs/HITL-FLOW.md) | Human-in-the-Loop detalhado |

---

## Visão Geral

O Squad Creator cria squads de agentes baseados em **elite minds reais** - pessoas com frameworks documentados e skin in the game.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SQUAD CREATOR FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  "Quero um squad de copywriting"                                │
│            ↓                                                    │
│  Research: Gary Halbert, Eugene Schwartz, Dan Kennedy...        │
│            ↓                                                    │
│  Clone Mind: Voice DNA + Thinking DNA                           │
│            ↓                                                    │
│  Create Agents: gary-halbert.md, eugene-schwartz.md...          │
│            ↓                                                    │
│  Smoke Tests: 3 testes de comportamento                         │
│            ↓                                                    │
│  Squad pronto: @copy                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Funcionalidades Principais

### Mind Cloning (MMOS-lite)

Extrai o DNA de experts reais:
- **Voice DNA**: Como comunicam (vocabulário, tom, histórias)
- **Thinking DNA**: Como pensam (frameworks, heurísticas, decisões)

### YOLO Mode

Roda automaticamente, para só quando dados faltam:
- Sem materiais? Pesquisa web automática
- Fidelidade: 60-75%

### QUALITY Mode

Máxima fidelidade com materiais do usuário:
- Livros, PDFs, transcrições
- Fidelidade: 85-95%

### Smoke Tests

3 testes obrigatórios para validar comportamento real:
1. Conhecimento do domínio
2. Tomada de decisão
3. Resposta a objeções

---

## Início Rápido

```bash
# 1. Ativar
@squad-creator

# 2. Criar squad
"Quero um squad de copywriting"

# 3. Escolher modo
🚀 YOLO (sem materiais)
💎 QUALITY (com materiais)

# 4. Aprovar elite minds
# 5. Aguardar criação
# 6. Usar: @copy
```

**Tutorial completo:** [QUICK-START.md](docs/QUICK-START.md)

---

## Comandos Principais

| Comando | Descrição |
|---------|-----------|
| `*create-squad` | Criar squad completo |
| `*clone-mind {name}` | Clonar expert específico |
| `*validate-squad {name}` | Validar squad existente |
| `*update-mind {slug}` | Atualizar DNA existente |
| `*quality-dashboard` | Ver métricas de qualidade |

**Referência completa:** [COMMANDS.md](docs/COMMANDS.md)

---

## Conceitos Fundamentais

| Conceito | Descrição |
|----------|-----------|
| **Mind** | Pessoa real com frameworks documentados |
| **Agent** | Clone digital do mind |
| **Voice DNA** | Como o expert comunica |
| **Thinking DNA** | Como o expert pensa/decide |
| **Tiers** | Níveis de agents (0=diagnóstico, 1=masters, etc.) |
| **Quality Gates** | Checkpoints de validação |
| **Fidelity** | % de similaridade com expert real |

**Explicação detalhada:** [CONCEPTS.md](docs/CONCEPTS.md)

---

## O Que Está Incluído

### Agents

- `squad-architect.md` - Agent arquiteto de squads
- `sop-extractor.md` - Agent de extração e análise de SOPs

### Tasks

**Criação**
- `create-squad.md` - Workflow completo de criação de squad (854 linhas)
- `create-agent.md` - Criação individual de agent para squads (756 linhas)
- `create-task.md` - Criação de task para workflows
- `create-template.md` - Criação de template para outputs
- `extract-sop.md` - Extração de SOPs de transcrições (AIOS-ready)

**Validação**
- `validate-squad.md` - Validação granular de squad (795 linhas, 9 fases)

### Templates

- `config-tmpl.yaml` - Template de configuração de squad
- `readme-tmpl.md` - Template de README para squads
- `agent-tmpl.md` - Template de definição de agent
- `task-tmpl.md` - Template de workflow de task
- `template-tmpl.yaml` - Template de template de output
- `pop-extractor-prompt.md` - Template de extração de SOP (SC-PE-001)

### Checklists

- `squad-checklist.md` - Checklist completo de validação de qualidade
- `sop-validation.md` - Checklist de validação de extração de SOP (SC-CK-001)

### Config

- `squad-config.yaml` - Configuração de squad com data sources

### Data

- `squad-kb.md` - Knowledge base de melhores práticas para squads

## Instalação

Para instalar este squad, execute:

```bash
npm run install:squad squad-architect
```

Ou manualmente:

```bash
node tools/install-squad.js squad-architect
```

---

## Sistema SOP Extractor

O SOP Extractor transforma transcrições de reuniões em Procedimentos Operacionais Padrão (SOPs) estruturados e prontos para automação.

### Propósito

Extrair SOPs de reuniões gravadas onde alguém explicou um processo de negócio, produzindo:
1. SOP completo seguindo padrão SC-PE-001 (11 partes)
2. Análise de automação usando heurística PV_PM_001
3. Blueprint de Squad AIOS pronto para criação imediata
4. Relatório de gaps com perguntas de esclarecimento

### Fontes de Dados

Configure fontes de transcrição em `config/squad-config.yaml`:

| Fonte | Tipo | Descrição |
|-------|------|-----------|
| `supabase` | banco de dados | Query na tabela `transcripts` (padrão) |
| `local_file` | arquivo | Ler de `inputs/transcripts/` |
| `api` | http | Buscar de API externa |
| `direct` | inline | Passar transcrição como parâmetro |

Para mudar fonte:
```yaml
# config/squad-config.yaml
data_sources:
  transcripts:
    active_source: supabase  # ← mude aqui
```

### Workflow de Extração de SOP

```bash
# Ativar o agent SOP extractor
@sop-extractor

# Rodar extração (workflow principal)
*extract-sop

# O agent irá:
# 1. Buscar transcrição da fonte configurada
# 2. Extrair estrutura do processo (passos, papéis, ferramentas)
# 3. Mapear cada passo para Task Anatomy (HO-TP-001)
# 4. Classificar tipos cognitivos (automatizável vs humano-only)
# 5. Aplicar análise de automação PV_PM_001
# 6. Gerar blueprint de Squad
# 7. Documentar gaps e perguntas de esclarecimento
```

### Funcionalidades Principais

| Funcionalidade | Descrição |
|----------------|-----------|
| **Taxonomia Cognitiva** | Classifica cada passo: Percepção, Análise, Julgamento, Empatia, etc. |
| **Tipos de Executor** | Atribui Human/Agent/Hybrid/Worker por passo |
| **Análise de Automação** | Aplica PV_PM_001 (frequência × impacto × guardrails) |
| **META-AXIOMAS** | Pontua processo em 10 dimensões de qualidade |
| **Blueprint de Squad** | Gera agents, tasks, checkpoints, workflow YAML |

### Padrões Utilizados

- **SC-PE-001** - Padrão de Extração de SOP (11 partes)
- **HO-TP-001** - Task Anatomy (8 campos obrigatórios)
- **HO-EP-001-004** - Tipos de Executor (Human/Agent/Hybrid/Worker)
- **PV_PM_001** - Heurística de Automation Tipping Point
- **SC-CK-001** - Checklist de Validação de SOP

### Pipeline: Transcrição → Squad

```
Gravação de Reunião
      ↓
  Transcrição (Supabase/Arquivo/API)
      ↓
  @sop-extractor (*extract-sop)
      ↓
  Documento SOP (SC-PE-001)
      ↓
  Validação (SC-CK-001)
      ↓
  @squad-architect (*create-squad)
      ↓
  Squad Funcional
```

**Documentação completa:** Veja `docs/sop-extraction-process.md` para detalhes do processo.

---

## Exemplos de Uso

### 1. Criar um Squad Completo

```bash
# Ativar o agent squad architect
@squad-architect

# Iniciar workflow interativo de criação de squad
*create-squad

# Siga o processo de elicitação guiado
# O agent ajudará você a definir:
# - Domínio e propósito
# - Agents necessários e suas personas
# - Tasks e workflows
# - Templates de output
# - Documentação
```

### 2. Criar Componentes Individuais

```bash
# Criar agent standalone para squad existente
*create-agent

# Criar workflow de task
*create-task

# Criar template de output
*create-template
```

### 3. Validar um Squad

```bash
# Rodar validação completa
*validate-squad
```

## Estrutura de Squad Criado

O Squad Architect gera a seguinte estrutura:

```
squads/nome-do-seu-squad/
├── agents/                          # Agents específicos do domínio
│   └── seu-agent.md
├── checklists/                      # Checklists de validação
│   └── seu-checklist.md
├── config.yaml                      # Configuração do pack
├── data/                           # Knowledge bases
│   └── seu-kb.md
├── README.md                       # Documentação do pack
├── tasks/                          # Tasks de workflow
│   └── sua-task.md
└── templates/                      # Templates de output
    └── seu-template.yaml
```

## Funcionalidades Principais

### Elicitação Interativa

- Questionamento estruturado para coletar requisitos do domínio
- Modos de elicitação flexíveis (incremental vs. rápido)
- Opções de refinamento avançado para cada componente

### Geração Baseada em Templates

- Templates pré-construídos garantem consistência
- Placeholders customizáveis para conteúdo específico do domínio
- Melhores práticas embutidas em cada template

### Validação de Qualidade

- Checklist completo cobrindo todas as dimensões de qualidade
- Validação de segurança para todo código gerado
- Verificação de conformidade com padrões AIOS

### Automação de Documentação

- Arquivos README gerados automaticamente
- Exemplos de uso e guias de integração
- Documentação de melhores práticas

## Integração com AIOS Core

O Squad Architect integra perfeitamente com:

1. **AIOS Developer Agent** - Pode usar aios-developer para modificações avançadas de componentes
2. **Core Workflows** - Squads gerados integram com workflows greenfield e brownfield
3. **Memory Layer** - Rastreia todos os squads e componentes criados
4. **Installer** - Squads gerados podem ser instalados via installer padrão

## Criando Seu Primeiro Squad

1. **Defina Seu Domínio**
   - Que expertise você está capturando?
   - Que problemas ele resolverá?
   - Quem é o usuário alvo?

2. **Identifique Agents Necessários**
   - Que papéis/personas são necessários?
   - Que conhecimento especializado cada um tem?
   - Como eles colaboram?

3. **Projete Workflows**
   - Quais são as tarefas comuns?
   - Quais são os inputs e outputs?
   - Que validações são necessárias?

4. **Crie Templates**
   - Que documentos/artefatos são produzidos?
   - Que estrutura devem seguir?
   - Que orientação está embutida?

5. **Deixe o Creator Guiar Você**
   - O squad architect irá elicitar todos os detalhes
   - Ele gerará todos os componentes automaticamente
   - Ele validará tudo contra os padrões

## Exemplos de Squads Criados

Este creator pode gerar squads para qualquer domínio:

**Serviços Profissionais**
- Pack de Assistente Jurídico
- Pack de Contabilidade & Finanças
- Pack de Imobiliário
- Pack de Prática de Saúde

**Criativo & Conteúdo**
- Pack de Marketing de Conteúdo
- Pack de Produção de Vídeo
- Pack de Criação de Podcast
- Pack de Escrita Criativa

**Educação & Treinamento**
- Pack de Design Curricular
- Pack de Treinamento Corporativo
- Pack de Criação de Curso Online

**Pessoal & Estilo de Vida**
- Pack de Desenvolvimento Pessoal
- Pack de Fitness & Nutrição
- Pack de Organização Doméstica
- Pack de Planejamento de Viagem

## Melhores Práticas

1. **Comece Pequeno** - Inicie com um agent e algumas tasks
2. **Teste Completamente** - Valide com cenários do mundo real
3. **Itere** - Refine baseado em feedback do usuário
4. **Documente Bem** - Documentação clara garante adoção
5. **Compartilhe** - Contribua seu squad para a comunidade

## Customização

Você pode customizar squads gerados por:

1. Modificar as personas dos agents gerados
2. Adicionar tasks customizadas para workflows específicos
3. Criar templates específicos do domínio
4. Adicionar checklists de validação para sua indústria
5. Estender com knowledge bases especializadas

## Dependências

Este squad requer:

- Framework AIOS-FULLSTACK core
- AIOS Developer agent (opcional, para modificações avançadas)
- Entendimento básico da sua expertise de domínio

## Suporte & Comunidade

- **Documentação**: Veja `docs/squads.md` para guias detalhados
- **Exemplos**: Navegue `squads/` para implementações de referência
- **Issues**: Reporte problemas via GitHub issues
- **Contribuições**: Envie PRs com melhorias

## Troubleshooting

### Problemas Comuns

#### Agent Não Ativa

**Sintoma:** `@squad-architect` não responde ou mostra erro

**Soluções:**
1. Verifique se o arquivo do agent existe: `ls squads/squad-creator/agents/squad-architect.md`
2. Cheque sintaxe YAML: Garanta que o bloco YAML está formatado corretamente
3. Verifique se o squad está sincronizado: Cheque se `.claude/commands/squad-creator/` existe

---

#### Loop de Research Não Inicia

**Sintoma:** Ao solicitar um squad, agent faz perguntas ao invés de pesquisar

**Comportamento Esperado:** Agent deve IMEDIATAMENTE iniciar pesquisa quando domínio é mencionado.

**Solução:**
1. Diga explicitamente: "Inicie o mind-research-loop agora"
2. Ou reinicie: `*exit` então reative `@squad-architect`

---

#### Quality Gate de Agent Falha (SC_AGT_001)

**Sintoma:** Agent criado falha validação de qualidade

**Causas Comuns:**
| Problema | Correção |
|----------|----------|
| Lines < 300 | Expandir voice_dna, adicionar mais output_examples |
| voice_dna faltando | Adicionar vocabulary.always_use (8+) e never_use (5+) |
| output_examples < 3 | Adicionar exemplos realistas input→output |
| completion_criteria faltando | Definir critérios para cada tipo de task |
| handoff_to faltando | Definir 3+ cenários de handoff |

**Referência:** `checklists/agent-quality-gate.md`

---

#### Arquivos de Task Não Encontrados

**Sintoma:** Agent não encontra arquivo de task ao executar comando

**Soluções:**
1. Verifique se arquivo existe: `ls squads/squad-creator/tasks/`
2. Cheque se nome do arquivo corresponde à referência de dependência no YAML do agent
3. Garanta que extensão do arquivo é `.md`

---

#### Extração de SOP Incompleta

**Sintoma:** SOP extraído com partes faltando

**Solução:** Valide contra SC-PE-001 (11 partes obrigatórias):
1. Propósito
2. Escopo
3. Pré-condições
4. Passos
5. Regras de Decisão
6. Exceções
7. Outputs
8. Validação
9. Escalação
10. Auditoria
11. Histórico de Revisão

**Referência:** `checklists/sop-validation.md`

---

### Obtendo Ajuda

1. Execute `*help` para ver comandos disponíveis
2. Verifique pasta `docs/` para documentação detalhada
3. Revise `checklists/` para critérios de validação
4. Consulte `data/squad-kb.md` para melhores práticas

## Histórico de Versões

- **v2.0.0** - Mind Cloning com Voice DNA + Thinking DNA, Smoke Tests, Quality Dashboard
- **v1.1.0** - Sistema de validação granular (`*validate-squad`, `*validate-agent`, etc.)
- **v1.0.0** - Release inicial com workflow completo de criação de squad

Veja `CHANGELOG.md` para histórico detalhado de versões.

## Notas

- Squads gerados seguem padrões AIOS-FULLSTACK automaticamente
- Todos os componentes incluem validação e checks de segurança embutidos
- O creator usa elicitação interativa para garantir qualidade
- Documentação gerada inclui exemplos de uso e guias de integração

---

**Pronto para democratizar sua expertise? Vamos criar um squad!**

---

## Índice de Documentação

```
docs/
├── FAQ.md                   # Perguntas frequentes (NOVO)
├── TUTORIAL-COMPLETO.md     # Tutorial hands-on (NOVO)
├── QUICK-START.md           # Tutorial de 5 minutos
├── CONCEPTS.md              # Conceitos fundamentais
├── COMMANDS.md              # Referência de comandos
├── TROUBLESHOOTING.md       # Problemas e soluções
├── ARCHITECTURE-DIAGRAMS.md # Diagramas Mermaid
├── HITL-FLOW.md             # Human-in-the-Loop
└── sop-extraction-process.md # Processo de extração SOP
```

---

_Versão: 2.0.0_
_Compatível com: AIOS-FULLSTACK v5+_
_Última Atualização: 2026-02-03_
