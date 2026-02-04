# 🤖 Synkra AIOS - Agentes Disponíveis

Bem-vindo ao sistema de agentes AIOS! Aqui você tem uma equipe completa de IA especializados para diferentes áreas do desenvolvimento.

## 🚀 Como Usar os Agentes

### **Opção 1: Slash Commands (Recomendado)**

Digite `/` e procure pelos agentes:

```
/AIOS:agents:dev        → Dev (Atlas) - Implementação
/AIOS:agents:pm         → PM (Morgan) - Produto
/AIOS:agents:architect  → Architect (Aria) - Arquitetura
/AIOS:agents:qa         → QA (River) - Testes
/AIOS:agents:sm         → SM (Kai) - Scrum Master
/AIOS:agents:analyst    → Analyst (Atlas) - Análise
/AIOS:agents:devops     → DevOps (Gage) - Infraestrutura
/AIOS:agents:master     → Master (Orion) - Orquestração
```

### **Opção 2: Mention Direto**

Menção direta no chat: `@dev`, `@pm`, `@architect`, etc.

---

## 👥 Seus Agentes Especializados

### 💻 **Dev Agent** (Atlas)
- **Função**: Implementação de código
- **Especialidade**: Full-stack development, bugs, testes
- **Use quando**: Precisar escrever/revisar código
- **Arquivo**: `/AIOS/dev.md`

### 📊 **PM Agent** (Morgan)
- **Função**: Gerenciamento de produto
- **Especialidade**: PRD, roadmap, priorização
- **Use quando**: Definir requisitos, planejar features
- **Arquivo**: `/AIOS/pm.md`

### 🏛️ **Architect Agent** (Aria)
- **Função**: Arquitetura técnica
- **Especialidade**: Design de sistema, tech stack, escalabilidade
- **Use quando**: Precisar fazer decisões arquiteturais
- **Arquivo**: `/AIOS/architect.md`

### 🧪 **QA Agent** (River)
- **Função**: Garantia de qualidade
- **Especialidade**: Testes, automação, qualidade
- **Use quando**: Planejar/executar testes
- **Arquivo**: `/AIOS/qa.md`

### 📋 **SM Agent** (Kai)
- **Função**: Scrum Master / Agile
- **Especialidade**: Sprint planning, histórias, retrospectivas
- **Use quando**: Planejar sprints ou facilitar processo
- **Arquivo**: `/AIOS/sm.md`

### 📈 **Analyst Agent** (Atlas)
- **Função**: Análise de negócios
- **Especialidade**: Pesquisa, análise de dados, documentação
- **Use quando**: Pesquisar, analisar métricas, criar documentação
- **Arquivo**: `/AIOS/analyst.md`

### 🔧 **DevOps Agent** (Gage)
- **Função**: Infraestrutura e operações
- **Especialidade**: MCP, deployment, monitoring, backup
- **Use quando**: Configurar infraestrutura ou MCP servers
- **Arquivo**: `/AIOS/devops.md`

### 🌟 **Master Agent** (Orion)
- **Função**: Orquestração do framework
- **Especialidade**: Coordenação de agentes, workflows, saúde do sistema
- **Use quando**: Precisar de orientação ou coordenar múltiplos agentes
- **Arquivo**: `/AIOS/master.md`

---

## 🔄 Fluxos de Trabalho Recomendados

### **Novo Projeto**
1. **Analyst** - Pesquisa e análise inicial
2. **PM** - Criar PRD e roadmap
3. **Architect** - Design do sistema
4. **SM** - Planejar sprints

### **Implementação de Feature**
1. **SM** - Criar story detalhada
2. **Dev** - Implementar código
3. **QA** - Testes e validação
4. **DevOps** - Deployment

### **Troubleshooting**
1. **Dev** - Identificar e debugar
2. **Architect** - Validar arquitetura
3. **QA** - Escrever testes
4. **DevOps** - Validar infraestrutura

---

## 💡 Dicas de Uso

✅ **Use o agente certo para a tarefa** - Cada um tem especialidade
✅ **Combine agentes** - Um depois do outro para fluxos completos
✅ **Use comandos `*`** - Cada agente tem seus próprios comandos
✅ **Consulte o Master** - Quando não souber qual agente usar

---

## 📁 Estrutura

```
.claude/
├── commands/
│   └── AIOS/
│       ├── dev.md              ← Dev Agent
│       ├── pm.md               ← PM Agent
│       ├── architect.md         ← Architect Agent
│       ├── qa.md               ← QA Agent
│       ├── sm.md               ← SM Agent
│       ├── analyst.md          ← Analyst Agent
│       ├── devops.md           ← DevOps Agent
│       ├── master.md           ← Master Agent
│       └── README.md           ← Este arquivo
```

---

## 🚨 Troubleshooting

Se os agentes não aparecerem:

1. Verifique que os arquivos `.md` estão em `.claude/commands/AIOS/`
2. Reinicie o Claude Code
3. Type `/` e procure por `AIOS` ou nome do agente
4. Se ainda não funcionar, consulte `.aios-core/` para documentação oficial

---

**Pronto para começar?** Ative seu primeiro agente digitando `/` e procurando por um deles! 🚀

---

*Synkra AIOS v3.10.0 - Framework Universal de Agentes IA*
