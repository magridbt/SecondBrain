# Referência de Comandos

> Todos os comandos disponíveis no Squad Creator.

---

## Comandos de Criação

### `*create-squad`

Cria um squad completo através do workflow guiado.

```bash
*create-squad

# Ou especificando domínio direto
*create-squad copywriting
*create-squad legal --mode quality
```

**Parâmetros:**
| Param | Descrição | Default |
|-------|-----------|---------|
| `domain` | Área do squad | (pergunta) |
| `--mode` | yolo, quality, hybrid | yolo |
| `--materials` | Path para materiais | (nenhum) |

**Fluxo:**
1. Pre-flight (escolha de modo)
2. Research (3-5 iterações)
3. Aprovar minds
4. Clone + Create agents
5. Validação + Dashboard

---

### `*create-agent`

Cria um agent individual para um squad existente.

```bash
*create-agent gary-halbert --squad copy
*create-agent contract-reviewer --squad legal --tier 1
```

**Parâmetros:**
| Param | Descrição | Default |
|-------|-----------|---------|
| `name` | Nome do agent (kebab-case) | (obrigatório) |
| `--squad` | Squad de destino | (obrigatório) |
| `--tier` | 0, 1, 2, 3, orchestrator | (pergunta) |
| `--based-on` | Mind para clonar | (nenhum) |

**Nota:** Se `--based-on` especificado, roda `*clone-mind` primeiro.

---

### `*create-workflow`

Cria workflow multi-fase (preferido sobre tasks standalone).

```bash
*create-workflow high-ticket-copy --squad copy
```

**Quando usar:**
- Operação tem 3+ fases
- Múltiplos agents envolvidos
- Precisa checkpoints entre fases

---

### `*create-task`

Cria task atômica (quando workflow é overkill).

```bash
*create-task write-headline --squad copy
```

**Quando usar:**
- Operação single-session
- Um agent só é suficiente
- Não precisa checkpoints

---

### `*create-template`

Cria template de output para squad.

```bash
*create-template sales-page-tmpl --squad copy
```

---

## Comandos de Mind Cloning

### `*clone-mind`

Executa clonagem completa (Voice + Thinking DNA).

```bash
*clone-mind "Gary Halbert" --domain copywriting
*clone-mind "Dan Kennedy" --domain marketing --focus voice
```

**Parâmetros:**
| Param | Descrição | Default |
|-------|-----------|---------|
| `name` | Nome do expert | (obrigatório) |
| `--domain` | Área de expertise | (obrigatório) |
| `--focus` | voice, thinking, both | both |
| `--sources` | Path para materiais | (nenhum) |
| `--auto-acquire` | true, false | true |

**Output:**
```
outputs/minds/{slug}/
├── sources_inventory.yaml
├── voice_dna.yaml
├── thinking_dna.yaml
├── mind_dna_complete.yaml
├── smoke_test_result.yaml
└── quality_dashboard.md
```

---

### `*extract-voice-dna`

Extrai apenas Voice DNA (comunicação/escrita).

```bash
*extract-voice-dna "Gary Halbert" --sources ./materials/
```

**O que extrai:**
- Power words
- Signature phrases
- Stories/anecdotes
- Writing style
- Tone dimensions
- Anti-patterns
- Immune system

---

### `*extract-thinking-dna`

Extrai apenas Thinking DNA (frameworks/decisões).

```bash
*extract-thinking-dna "Dan Kennedy" --sources ./materials/
```

**O que extrai:**
- Recognition patterns
- Primary framework
- Secondary frameworks
- Heuristics
- Decision architecture
- Objection handling
- Handoff triggers

---

### `*update-mind`

Atualiza mind existente com novas fontes (brownfield).

```bash
*update-mind gary_halbert --sources ./new-materials/
*update-mind dan_kennedy --focus thinking
```

**Parâmetros:**
| Param | Descrição | Default |
|-------|-----------|---------|
| `slug` | Slug do mind existente | (obrigatório) |
| `--sources` | Path para novas fontes | (nenhum) |
| `--focus` | voice, thinking, both | both |
| `--mode` | merge, replace, selective | merge |

**Output:**
- DNA atualizado
- Diff report do que mudou
- Quality impact

---

### `*auto-acquire-sources`

Busca fontes automaticamente na web.

```bash
*auto-acquire-sources "Gary Halbert" --domain copywriting
```

**O que busca:**
- YouTube transcripts
- Book summaries
- Podcast appearances
- Articles/blogs

---

## Comandos de Validação

### `*validate-squad`

Valida squad inteiro com análise por componente.

```bash
*validate-squad copy
*validate-squad legal --verbose
```

**Valida:**
- Estrutura de diretórios
- Todos os agents
- Workflows e tasks
- Templates e checklists
- Quality scores

---

### `*validate-agent`

Valida agent individual contra AIOS 6-level structure.

```bash
*validate-agent squads/copy/agents/gary-halbert.md
```

**Critérios:**
- Lines >= 300
- voice_dna presente
- output_examples >= 3
- anti_patterns definidos
- completion_criteria

---

### `*validate-task`

Valida task contra Task Anatomy (8 campos).

```bash
*validate-task squads/copy/tasks/write-headline.md
```

---

### `*validate-workflow`

Valida workflow (fases, checkpoints).

```bash
*validate-workflow squads/copy/workflows/wf-sales-page.yaml
```

---

### `*quality-dashboard`

Gera dashboard de qualidade para mind ou squad.

```bash
*quality-dashboard gary_halbert
*quality-dashboard copy
```

**Métricas:**
- Sources count & tier ratio
- Voice score
- Thinking score
- Fidelity estimate
- Gaps & recommendations

---

## Comandos Utilitários

### `*list-squads`

Lista todos os squads criados.

```bash
*list-squads
```

**Output:**
```
┌──────────┬─────────────┬────────┬───────────┐
│ Squad    │ Agents      │ Score  │ Status    │
├──────────┼─────────────┼────────┼───────────┤
│ copy     │ 6           │ 8.2    │ ✅ Active │
│ legal    │ 4           │ 7.8    │ ✅ Active │
│ data     │ 3           │ 6.5    │ ⚠️ Draft  │
└──────────┴─────────────┴────────┴───────────┘
```

---

### `*show-registry`

Mostra registro de squads (existentes, padrões, gaps).

```bash
*show-registry
```

---

### `*squad-analytics`

Dashboard detalhado de analytics por squad.

```bash
*squad-analytics
*squad-analytics copy
```

**Mostra:**
- Agents por tier
- Tasks por tipo
- Workflows
- Templates
- Checklists
- Usage stats

---

### `*refresh-registry`

Escaneia squads/ e atualiza registro.

```bash
*refresh-registry
```

**Quando usar:**
- Após criar squad manualmente
- Após mover/renomear squads
- Sincronizar estado

---

### `*help`

Mostra lista de comandos disponíveis.

```bash
*help
```

---

### `*exit`

Desativa o Squad Architect.

```bash
*exit
```

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMANDOS MAIS USADOS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CRIAR                                                          │
│  *create-squad {domain}     Criar squad completo               │
│  *clone-mind {name}         Clonar expert específico           │
│                                                                 │
│  VALIDAR                                                        │
│  *validate-squad {name}     Validar squad existente            │
│  *quality-dashboard {name}  Ver métricas de qualidade          │
│                                                                 │
│  GERENCIAR                                                      │
│  *list-squads               Ver squads disponíveis             │
│  *refresh-registry          Atualizar registro                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Squad Architect | Commands Reference v1.0**
