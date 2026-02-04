# AIOS Agents - Slash Commands Setup ✅

Os agentes AIOS foram registrados como slash commands do Claude Code!

## Como usar:

Digite `/` e procure pelos agentes disponíveis:

### Agentes Registrados:

| Comando | Agente | Função |
|---------|--------|--------|
| `/AIOS:agents:dev` | Dev | Desenvolvimento de código e implementação |
| `/AIOS:agents:pm` | PM (Morgan) | Estratégia e gestão de produto |
| `/AIOS:agents:po` | PO (Pax) | Product Owner e priorização |
| `/AIOS:agents:architect` | Architect (Aria) | Design de sistema e arquitetura |
| `/AIOS:agents:qa` | QA | Testes e garantia de qualidade |
| `/AIOS:agents:sm` | SM (River) | Scrum Master e gestão ágil |
| `/AIOS:agents:analyst` | Analyst (Atlas) | Análise e pesquisa |
| `/AIOS:agents:aios-master` | AIOS Master (Orion) | Orquestração do framework |

## Como funciona:

1. **Digite `/`** e você verá as opções de autocomplete
2. **Selecione o agente** (ex: `/AIOS:agents:dev`)
3. **O agente é ativado** com sua persona completa
4. **Use comandos com `*`** (ex: `*help`, `*create-story`, etc.)

## Exemplos:

```
/AIOS:agents:pm
*create-prd

/AIOS:agents:dev  
*help

/AIOS:agents:architect
*design-system
```

## Reinicializar (se necessário):

```bash
node scripts/register-aios-commands.js
```

---
✅ **Configuração Concluída!** Agora todos os agentes estão disponíveis via slash commands.
