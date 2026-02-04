/**
 * Script de Atualização Automática do SystemFile.md
 *
 * Este script consulta o banco de dados Supabase e atualiza a seção
 * de "Documentos de Ensinamentos" no arquivo docs/SystemFile.md
 *
 * Execução: Automática a cada 7 dias via Vercel Cron
 *
 * @author Sistema Sri Amma Bhagavan
 * @version 1.0.0
 * @date 23/01/2026
 */

import { createAdminClient } from '@/lib/supabase/server'
import * as fs from 'fs'
import * as path from 'path'

interface Document {
  id: string
  name: string
  type: string
  status: string
  chunk_count: number
  created_at: string
  source?: {
    id: string
    name: string
  }
}

interface DocumentStats {
  totalDocuments: number
  totalChunks: number
  byYear: Record<string, { documents: number; chunks: number; language: string }>
}

/**
 * Formata a data para o padrão brasileiro DD/MM/YYYY
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Extrai informações do nome do documento
 */
function parseDocumentName(name: string): {
  year: string
  darshan: string
  date: string
  language: string
  displayName: string
} {
  // Pattern: Year X - YYYY - DATE - LANG - Nome
  const yearMatch = name.match(/Year (\d+)/)
  const darshanMatch = name.match(/(\d+)\s*Darshan/)
  const dateMatch = name.match(/(\d{4}-\d{2}-\d{2})/)
  const langMatch = name.match(/- (PT|EN) -/)

  return {
    year: yearMatch ? `Year ${yearMatch[1]}` : 'Outros',
    darshan: darshanMatch ? `${darshanMatch[1]}º Darshan` : '-',
    date: dateMatch ? dateMatch[1] : '-',
    language: langMatch ? langMatch[1] : 'EN',
    displayName: name.split(' - ').pop() || name
  }
}

/**
 * Calcula estatísticas dos documentos
 */
function calculateStats(documents: Document[]): DocumentStats {
  const stats: DocumentStats = {
    totalDocuments: documents.length,
    totalChunks: 0,
    byYear: {}
  }

  documents.forEach(doc => {
    stats.totalChunks += doc.chunk_count || 0

    const parsed = parseDocumentName(doc.name)
    const yearKey = parsed.year

    if (!stats.byYear[yearKey]) {
      stats.byYear[yearKey] = { documents: 0, chunks: 0, language: parsed.language }
    }

    stats.byYear[yearKey].documents++
    stats.byYear[yearKey].chunks += doc.chunk_count || 0
  })

  return stats
}

/**
 * Gera a seção de documentos de ensinamentos em Markdown
 */
function generateTeachingDocumentsSection(documents: Document[]): string {
  const stats = calculateStats(documents)
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })

  // Separar documentos por programa/ano
  const year1Docs = documents.filter(d => d.name.includes('Year 1'))
  const year2Docs = documents.filter(d => d.name.includes('Year 2'))
  const year3Docs = documents.filter(d => d.name.includes('Year 3'))
  const year4Docs = documents.filter(d => d.name.includes('Year 4'))
  const otherDocs = documents.filter(d =>
    !d.name.includes('Year 1') &&
    !d.name.includes('Year 2') &&
    !d.name.includes('Year 3') &&
    !d.name.includes('Year 4')
  )

  // Ordenar por data
  const sortByDate = (a: Document, b: Document) => {
    const dateA = a.name.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || ''
    const dateB = b.name.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || ''
    return dateA.localeCompare(dateB)
  }

  year1Docs.sort(sortByDate)
  year2Docs.sort(sortByDate)
  year3Docs.sort(sortByDate)
  year4Docs.sort(sortByDate)

  let markdown = `# 📖 CONTEÚDO DE ENSINAMENTOS

## 0. Documentos de Ensinamentos (Darshans)

> **Total de Documentos:** ${stats.totalDocuments} arquivos
> **Total de Chunks:** ${stats.totalChunks} fragmentos indexados
> **Status:** Todos indexados e prontos para busca
> **Última Atualização Automática:** ${today}

---

### Resumo por Ano

| Ano | Programa | Documentos | Chunks | Idiomas |
|-----|----------|------------|--------|---------|
`

  // Adicionar linhas por ano
  Object.entries(stats.byYear).forEach(([year, data]) => {
    markdown += `| ${year === 'Year 1' ? '2021-2022' : year === 'Year 2' ? '2022-2023' : year === 'Year 3' ? '2023-2024' : year === 'Year 4' ? '2024-2025' : '2026'} | ${year} | ${data.documents} | ${data.chunks} | ${data.language} |\n`
  })

  markdown += `| **TOTAL** | - | **${stats.totalDocuments}** | **${stats.totalChunks}** | PT/EN |

---
`

  // Função para gerar tabela de documentos
  const generateDocTable = (docs: Document[], title: string, language: string): string => {
    if (docs.length === 0) return ''

    let table = `
### ${title}

| # | Data | Darshan | Nome do Arquivo | Chunks | Status |
|---|------|---------|-----------------|--------|--------|
`
    docs.forEach((doc, index) => {
      const parsed = parseDocumentName(doc.name)
      const dateFormatted = parsed.date !== '-'
        ? new Date(parsed.date).toLocaleDateString('pt-BR')
        : '-'
      const shortName = doc.name.split(' - ').slice(-1)[0] || doc.name

      table += `| ${index + 1} | ${dateFormatted} | ${parsed.darshan} | \`${shortName}\` | ${doc.chunk_count} | ✅ Indexado |\n`
    })

    const totalChunks = docs.reduce((sum, d) => sum + (d.chunk_count || 0), 0)
    table += `\n**Subtotal:** ${docs.length} documentos | ${totalChunks} chunks\n\n---\n`

    return table
  }

  // Adicionar tabelas por ano
  if (year1Docs.length > 0) {
    markdown += generateDocTable(year1Docs, '📅 ANO 1 - Programa Year 1 (2021-2022) - Português', 'PT')
  }
  if (year2Docs.length > 0) {
    markdown += generateDocTable(year2Docs, '📅 ANO 2 - Programa Year 2 (2022-2023) - Português', 'PT')
  }
  if (year3Docs.length > 0) {
    markdown += generateDocTable(year3Docs, '📅 ANO 3 - Programa Year 3 (2023-2024) - Português', 'PT')
  }
  if (year4Docs.length > 0) {
    markdown += generateDocTable(year4Docs, '📅 ANO 4 - Programa Year 4 (2024-2025) - Português', 'PT')
  }
  if (otherDocs.length > 0) {
    markdown += generateDocTable(otherDocs, '🌍 Outros Documentos', 'EN')
  }

  // Lista de IDs
  markdown += `
### 📋 Lista Completa de IDs (para referência técnica)

<details>
<summary>Clique para expandir IDs dos documentos</summary>

| Nome Resumido | UUID |
|---------------|------|
`

  documents.forEach(doc => {
    const shortName = doc.name.length > 40 ? doc.name.substring(0, 40) + '...' : doc.name
    markdown += `| ${shortName} | \`${doc.id}\` |\n`
  })

  markdown += `
</details>

---

### ⏳ Documentos Pendentes (A Carregar)

| Ano | Programa | Status |
|-----|----------|--------|
`

  // Verificar o que falta
  if (year1Docs.length < 12) {
    markdown += `| 2021-2022 | Year 1 | 🔲 ${12 - year1Docs.length} Darshans pendentes |\n`
  }
  if (year2Docs.length === 0) {
    markdown += `| 2022-2023 | Year 2 | 🔲 Todos os Darshans pendentes |\n`
  } else if (year2Docs.length < 12) {
    markdown += `| 2022-2023 | Year 2 | 🔲 ${12 - year2Docs.length} Darshans pendentes |\n`
  }
  if (year3Docs.length === 0) {
    markdown += `| 2023-2024 | Year 3 | 🔲 Todos os Darshans pendentes |\n`
  }
  if (year4Docs.length === 0) {
    markdown += `| 2024-2025 | Year 4 | 🔲 Todos os Darshans pendentes |\n`
  }

  markdown += `
---

### 🤖 Atualização Automática

Este documento é atualizado automaticamente **a cada 7 dias** pelo sistema.

**Próxima atualização programada:** ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}

**Endpoint de atualização manual:** \`POST /api/cron/update-system-file\`

---
`

  return markdown
}

/**
 * Atualiza o arquivo SystemFile.md com os documentos atuais
 */
export async function updateSystemFile(): Promise<{ success: boolean; message: string; documentCount?: number }> {
  try {
    const adminClient = createAdminClient()

    // Buscar todos os documentos ativos
    const { data: documents, error } = await adminClient
      .from('documents')
      .select('id, name, type, status, chunk_count, created_at')
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) {
      console.error('Erro ao buscar documentos:', error)
      return { success: false, message: `Erro ao buscar documentos: ${error.message}` }
    }

    if (!documents || documents.length === 0) {
      return { success: false, message: 'Nenhum documento encontrado no banco de dados' }
    }

    // Gerar a nova seção de documentos
    const teachingSection = generateTeachingDocumentsSection(documents)

    // Ler o arquivo atual
    const filePath = path.join(process.cwd(), 'docs', 'SystemFile.md')

    if (!fs.existsSync(filePath)) {
      return { success: false, message: 'Arquivo SystemFile.md não encontrado' }
    }

    let content = fs.readFileSync(filePath, 'utf-8')

    // Encontrar e substituir a seção de documentos de ensinamentos
    const startMarker = '# 📖 CONTEÚDO DE ENSINAMENTOS'
    const endMarker = '# 💻 ARQUIVOS DO SISTEMA'

    const startIndex = content.indexOf(startMarker)
    const endIndex = content.indexOf(endMarker)

    if (startIndex === -1 || endIndex === -1) {
      return { success: false, message: 'Marcadores de seção não encontrados no SystemFile.md' }
    }

    // Reconstruir o arquivo
    const beforeSection = content.substring(0, startIndex)
    const afterSection = content.substring(endIndex)

    const newContent = beforeSection + teachingSection + '\n' + afterSection

    // Salvar o arquivo atualizado
    fs.writeFileSync(filePath, newContent, 'utf-8')

    console.log(`SystemFile.md atualizado com sucesso! ${documents.length} documentos registrados.`)

    return {
      success: true,
      message: `SystemFile.md atualizado com sucesso! ${documents.length} documentos registrados.`,
      documentCount: documents.length
    }

  } catch (error) {
    console.error('Erro ao atualizar SystemFile:', error)
    return { success: false, message: `Erro interno: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}
