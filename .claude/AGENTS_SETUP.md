# 🤖 Agentes AIOS - Guia de Ativação

## ✅ Status: Todos os 8 Agentes Configurados!

Os agentes AIOS foram configurados e estão prontos para uso no Claude Code.

---

## 🚀 Como Ativar os Agentes

### **Método 1: Slash Commands (Recomendado)**

No Claude Code, digite `/` e procure pelos agentes:

```
/AIOS:agents:devops     ← DevOps Agent (Gage) 🔧
/AIOS:agents:dev        ← Dev Agent (Atlas) 💻
/AIOS:agents:pm         ← PM Agent (Morgan) 📊
/AIOS:agents:architect  ← Architect Agent (Aria) 🏛️
/AIOS:agents:qa         ← QA Agent (River) 🧪
/AIOS:agents:sm         ← SM Agent (Kai) 📋
/AIOS:agents:analyst    ← Analyst Agent (Atlas) 📈
/AIOS:agents:master     ← Master Agent (Orion) 🌟
```

### **Método 2: Ativar com Mention Direto**

Simplesmente mencione o agente na conversa:
- `@devops` - Infrastructure & DevOps
- `@dev` - Development
- `@pm` - Product Management
- `@architect` - Technical Architecture
- `@qa` - Quality Assurance
- `@sm` - Scrum Master
- `@analyst` - Business Analysis
- `@master` - Framework Coordinator

---

## 📋 Seus 8 Agentes Especializados

| # | Agente | Nome | Especialidade | Atalho |
|---|--------|------|---------------|--------|
| 1 | **DevOps** 🔧 | Gage | Infraestrutura, MCP, Deployment | `/AIOS:agents:devops` |
| 2 | **Dev** 💻 | Atlas | Código, Implementação, Testes | `/AIOS:agents:dev` |
| 3 | **PM** 📊 | Morgan | Produto, PRD, Roadmap | `/AIOS:agents:pm` |
| 4 | **Architect** 🏛️ | Aria | Sistema, Tech Stack, Design | `/AIOS:agents:architect` |
| 5 | **QA** 🧪 | River | Testes, Qualidade, Automação | `/AIOS:agents:qa` |
| 6 | **SM** 📋 | Kai | Agile, Sprints, Histórias | `/AIOS:agents:sm` |
| 7 | **Analyst** 📈 | Atlas | Análise, Pesquisa, Documentação | `/AIOS:agents:analyst` |
| 8 | **Master** 🌟 | Orion | Orquestração, Coordenação | `/AIOS:agents:master` |

---

## 🔧 Primeiros Passos com DevOps Agent

Já que você quer ativar o DevOps Agent, aqui está como:

### **1. Digite o Slash Command**
```
/AIOS:agents:devops
```

### **2. Aguarde a ativação**
Você verá o agente DevOps (Gage) ativado com sua persona de Infrastructure Specialist

### **3. Use os Comandos do DevOps**
```
*help                   # Ver todos os comandos
*search-mcp            # Buscar servidores MCP
*add-mcp              # Adicionar novo MCP
*list-mcps            # Listar MCPs ativos
*setup-mcp-docker     # Configurar Docker MCP
*health-check         # Validar saúde do sistema
```

---

## 📁 Estrutura de Arquivos

Todos os agentes estão configurados em:

```
.claude/
├── AGENTS_SETUP.md         ← Este arquivo
└── commands/
    └── AIOS/
        ├── README.md               (Visão geral)
        ├── devops.md              (DevOps Agent - Gage) ⭐
        ├── dev.md                 (Dev Agent - Atlas)
        ├── pm.md                  (PM Agent - Morgan)
        ├── architect.md           (Architect Agent - Aria)
        ├── qa.md                  (QA Agent - River)
        ├── sm.md                  (SM Agent - Kai)
        ├── analyst.md             (Analyst Agent - Atlas)
        └── master.md              (Master Agent - Orion)
```

---

## 🔄 Fluxos de Trabalho Recomendados

### **Configurar Infraestrutura**
```
1. /AIOS:agents:devops  → Configure MCPs
2. /AIOS:agents:architect → Valide design
3. /AIOS:agents:devops  → Deploy
```

### **Desenvolver Feature Completa**
```
1. /AIOS:agents:pm      → Definir PRD
2. /AIOS:agents:architect → Design
3. /AIOS:agents:sm      → Stories
4. /AIOS:agents:dev     → Implementar
5. /AIOS:agents:qa      → Testar
6. /AIOS:agents:devops  → Deploy
```

### **Troubleshooting de Problema**
```
1. /AIOS:agents:dev     → Debugar
2. /AIOS:agents:devops  → Verificar infraestrutura
3. /AIOS:agents:qa      → Escrever teste
4. /AIOS:agents:architect → Validar design
```

---

## 💡 Dicas e Boas Práticas

✅ **Use o agente certo** - Cada um tem expertise específica
✅ **Combine agentes** - Fluxos completos com múltiplos agentes
✅ **Consulte o Master** - Quando não souber qual agente usar
✅ **Use comandos `*`** - Cada agente tem seus próprios comandos
✅ **Leia os contextos** - Cada arquivo .md tem detalhes

---

## 🚨 Se Não Aparecerem os Agentes

**Solução 1:** Reinicie o Claude Code
**Solução 2:** Verifique a pasta `.claude/commands/AIOS/`
**Solução 3:** Procure por AIOS no slash command `/AIOS`

---

## 📚 Documentação Adicional

- **AIOS Documentation**: `.aios-core/` (v3.10.0)
- **Agent Details**: `.claude/commands/AIOS/*.md`
- **Project Setup**: Ver README.md do projeto

---

## 🎯 Próximos Passos

1. **Digite** `/AIOS:agents:devops` para ativar DevOps Agent
2. **Digite** `*help` para ver comandos disponíveis
3. **Explore** outros agentes conforme necessário
4. **Combine** agentes em fluxos de trabalho

---

**Pronto?** Digite `/AIOS:agents:devops` agora e comece! 🚀

---

*Synkra AIOS v3.10.0 - Sistema Universal de Agentes IA para Desenvolvimento*
*Configurado para: SecondBrain-SriAmmaBhagavan*
