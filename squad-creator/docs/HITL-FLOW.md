# Human-in-the-Loop Flow: Squad Creation

> **Filosofia:** "YOLO Mode First, Human When Needed"
>
> Roda automaticamente o máximo possível. Para APENAS quando dados faltam.

---

## Modos de Execução

| Modo | Quando Usar | Interações | Qualidade Esperada |
|------|-------------|------------|-------------------|
| **🚀 YOLO** | Não tem materiais | Só aprovação final | 60-75% |
| **💎 QUALITY** | Tem livros/PDFs/cursos | Coleta + Validação | 85-95% |
| **🔀 HYBRID** | Materiais de alguns experts | Por expert | Variável |

---

## Fluxo Visual

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🛑 PRE-FLIGHT (SEMPRE)                                                        ║
║                                                                               ║
║ "Vou criar um squad de {domain}. Para máxima qualidade, você teria:"          ║
║ • 2-3 livros por expert                                                       ║
║ • 5-10 entrevistas/podcasts                                                   ║
║ • Artigos/newsletters                                                         ║
║                                                                               ║
║ PERGUNTAS:                                                                    ║
║ 1. Modo: [YOLO] [QUALITY] [HYBRID]                                            ║
║ 2. Conhece algum expert? [Sim] [Não]                                          ║
║ 3. Tempo para interações? [Mínimo] [Moderado] [Alto]                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              ┌─────────┐      ┌───────────┐     ┌──────────┐
              │  YOLO   │      │  QUALITY  │     │  HYBRID  │
              └────┬────┘      └─────┬─────┘     └────┬─────┘
                   │                 │                │
                   ▼                 ▼                ▼
            ┌──────────────────────────────────────────────────┐
            │ PHASE 1: MIND RESEARCH (AUTO)                    │
            │ • Pesquisa elite minds no domínio                │
            │ • 3-5 iterações com devil's advocate             │
            │ • Valida frameworks documentados                 │
            └──────────────────────────────────────────────────┘
                                      │
                   ┌──────────────────┼──────────────────┐
                   ▼                  ▼                  ▼
            ┌────────────┐    ╔═══════════════════╗    ┌────────────┐
            │ YOLO:      │    ║ QUALITY/HYBRID:   ║    │ HYBRID:    │
            │ Auto-      │    ║ 🛑 CP1: VALIDATE  ║    │ CP1 se     │
            │ approve    │    ║    MINDS          ║    │ pediu      │
            │ minds      │    ╚═══════════════════╝    │            │
            └────────────┘              │               └────────────┘
                   │                    │                     │
                   │         ╔═════════════════════════════╗  │
                   │         ║ 🛑 CP_MATERIALS: COLETA     ║  │
                   │         ║                             ║  │
                   │         ║ "Você tem materiais de X?"  ║  │
                   │         ║ • Livros: ___               ║  │
                   │         ║ • Cursos: ___               ║  │
                   │         ║ • Entrevistas: ___          ║  │
                   │         ╚═════════════════════════════╝  │
                   │                    │                     │
                   └────────────────────┼─────────────────────┘
                                        ▼
            ┌──────────────────────────────────────────────────┐
            │ PHASE 2: SOURCE COLLECTION (PER MIND)            │
            │ • Processa materiais do usuário (Tier 0)         │
            │ • Pesquisa web complementar (Tier 1-2)           │
            │ • Valida triangulação (3+ fontes por claim)      │
            └──────────────────────────────────────────────────┘
                                        │
                   ┌────────────────────┼────────────────────┐
                   ▼                    ▼                    ▼
            ┌────────────┐    ╔═══════════════════╗    ┌────────────┐
            │ YOLO:      │    ║ QUALITY:          ║    │ <5 fontes: │
            │ Auto se    │    ║ 🛑 CP_SOURCES:    ║    │ 🛑 PARAR   │
            │ 10+ fontes │    ║    VALIDAR        ║    │ Pedir mais │
            └────────────┘    ╚═══════════════════╝    └────────────┘
                   │                    │                     │
                   └────────────────────┼─────────────────────┘
                                        ▼
            ┌──────────────────────────────────────────────────┐
            │ PHASE 3: DNA EXTRACTION (AUTO)                   │
            │ • Voice DNA: vocabulário, histórias, tom         │
            │ • Thinking DNA: frameworks, heurísticas, decisões│
            │ • Synthesis: mind_dna_complete.yaml              │
            └──────────────────────────────────────────────────┘
                                        │
                   ┌────────────────────┼────────────────────┐
                   ▼                    ▼                    ▼
            ┌────────────┐    ╔═══════════════════╗    ┌────────────┐
            │ YOLO:      │    ║ CONHECE EXPERT:   ║    │ Score <7:  │
            │ Auto se    │    ║ 🛑 CP_DNA:        ║    │ 🛑 PARAR   │
            │ score ≥7   │    ║    VALIDAR DNA    ║    │ Revisar    │
            └────────────┘    ╚═══════════════════╝    └────────────┘
                   │                    │                     │
                   └────────────────────┼─────────────────────┘
                                        ▼
            ┌──────────────────────────────────────────────────┐
            │ PHASE 4: AGENT CREATION (AUTO)                   │
            │ • Gera agent.md usando mind_dna_complete.yaml    │
            │ • Quality gate SC_AGT_001                        │
            │ • Smoke tests (3 cenários)                       │
            └──────────────────────────────────────────────────┘
                                        │
                   ┌────────────────────┼────────────────────┐
                   ▼                    ▼                    ▼
            ┌────────────┐    ╔═══════════════════╗    ┌────────────┐
            │ YOLO:      │    ║ QUALITY/Alto:     ║    │ Test fail: │
            │ Auto se    │    ║ 🛑 CP_AGENT:      ║    │ 🛑 PARAR   │
            │ tests pass │    ║    SMOKE TEST     ║    │ Ajustar    │
            └────────────┘    ╚═══════════════════╝    └────────────┘
                   │                    │                     │
                   └────────────────────┼─────────────────────┘
                                        ▼
                    ════════════════════════════════════════
                    │ REPETIR PHASES 2-4 PARA CADA MIND    │
                    ════════════════════════════════════════
                                        ▼
            ┌──────────────────────────────────────────────────┐
            │ PHASE 5: SQUAD ASSEMBLY (AUTO)                   │
            │ • Cria orchestrator agent                        │
            │ • Define handoffs entre agentes                  │
            │ • Gera config.yaml, README.md                    │
            │ • Integration test                               │
            └──────────────────────────────────────────────────┘
                                        │
                   ┌────────────────────┼────────────────────┐
                   ▼                    ▼                    ▼
            ┌────────────┐    ╔═══════════════════╗    ┌────────────┐
            │ YOLO:      │    ║ Moderado/Alto:    ║    │ Int. fail: │
            │ Auto se    │    ║ 🛑 CP_ARCH:       ║    │ 🛑 PARAR   │
            │ int. pass  │    ║    ARQUITETURA    ║    │ Debug      │
            └────────────┘    ╚═══════════════════╝    └────────────┘
                   │                    │                     │
                   └────────────────────┼─────────────────────┘
                                        ▼
            ╔═══════════════════════════════════════════════════════════════════╗
            ║ 🛑 CP_FINAL: APROVAÇÃO FINAL (SEMPRE)                             ║
            ║                                                                   ║
            ║ ┌───────────────────────────────────────────────────────────────┐ ║
            ║ │ SQUAD PRONTO: {squad_name}                                    │ ║
            ║ │                                                               │ ║
            ║ │ │ Componente    │ Status │ Quality │ Fidelity │               │ ║
            ║ │ │───────────────│────────│─────────│──────────│               │ ║
            ║ │ │ gary-halbert  │ ✅     │ 8.5/10  │ 85%      │               │ ║
            ║ │ │ dan-kennedy   │ ✅     │ 7.2/10  │ 65%      │               │ ║
            ║ │ │ copy-chief    │ ✅     │ 8.0/10  │ N/A      │               │ ║
            ║ │                                                               │ ║
            ║ │ [✅ DEPLOY] [🔄 AJUSTAR] [❌ CANCELAR]                         │ ║
            ║ └───────────────────────────────────────────────────────────────┘ ║
            ╚═══════════════════════════════════════════════════════════════════╝
```

---

## Checkpoints por Modo

| Checkpoint | YOLO Min | YOLO Mod | QUALITY | HYBRID |
|------------|----------|----------|---------|--------|
| CP1: Minds | Auto | 🛑 | 🛑 | 🛑 |
| CP_MAT: Materials | Skip | Skip | 🛑 | Per mind |
| CP_SRC: Sources | Auto (≥10) | Auto (≥10) | 🛑 | Per mind |
| CP_DNA: Validation | Auto (≥7) | Auto (≥7) | 🛑 if knows | 🛑 if knows |
| CP_AGT: Smoke Test | Auto (pass) | Auto (pass) | 🛑 | Auto |
| CP_ARCH: Architecture | Auto | 🛑 | 🛑 | 🛑 |
| CP_FINAL: Approval | 🛑 | 🛑 | 🛑 | 🛑 |

**Legenda:** 🛑 = Para e pede input | Auto = Prossegue automaticamente

---

## Quando YOLO Mode Para

Mesmo em YOLO, o workflow PARA se:

1. **Fontes Insuficientes:** < 5 fontes para um mind
2. **Mind Muito Obscuro:** Não encontra framework documentado
3. **Quality Gate Crítico Falha:** Score < 5/10
4. **Usuário Indicou Materiais:** Mas não forneceu path
5. **Contradição Não Resolvida:** DNA extraction encontra conflito

---

## Qualidade Esperada

```
┌─────────────────────────────────────────────────────────────────────┐
│                    QUALITY EXPECTATION MATRIX                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  100% ─┬─────────────────────────────────────────────────────────   │
│        │                                     ┌───────────────────   │
│   95% ─┤                                     │ QUALITY + Known     │
│        │                           ┌─────────┤ Expert Validation   │
│   85% ─┤                           │ QUALITY │                      │
│        │                           │ Mode    │                      │
│   75% ─┤               ┌───────────┤         └───────────────────   │
│        │               │           │                                │
│   65% ─┤   ┌───────────┤ YOLO +    └─────────────────────────────   │
│        │   │ YOLO      │ Some                                       │
│   55% ─┤   │ Basic     │ Sources                                    │
│        │   │           │                                            │
│   45% ─┼───┴───────────┴─────────────────────────────────────────   │
│        │                                                            │
│    0% ─┴─────────────────────────────────────────────────────────   │
│        │           │           │           │           │            │
│      Web Only   + Books    + Courses   + Validation  + Expert      │
│                                                        Review       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Comandos

```bash
# YOLO Mode (default)
*create-squad copywriting

# Quality Mode
*create-squad copywriting --mode quality

# Hybrid Mode
*create-squad copywriting --mode hybrid

# Com materiais já indicados
*create-squad copywriting --materials /path/to/materials/
```

---

## Trade-off Summary

| Aspecto | YOLO | QUALITY |
|---------|------|---------|
| **Tempo** | 4-6h | 6-8h |
| **Interações** | 1-2 | 5-8 |
| **Fidelidade** | 60-75% | 85-95% |
| **Voice DNA** | Aproximado | Preciso |
| **Frameworks** | Públicos só | Completos |
| **Contradições** | Podem faltar | Capturadas |
| **Recomendado** | POC, testes | Produção |

---

**Squad Architect | HITL Flow v2.0**
*"YOLO first, quality when it matters"*
