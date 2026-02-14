#!/usr/bin/env npx ts-node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkDatabase() {
  console.log('🔍 Verificando base de dados SecondBrain...\n')

  try {
    // 1. Contar documentos
    console.log('📄 DOCUMENTOS:')
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, name, status, chunk_count')

    if (docError) {
      console.error('❌ Erro ao buscar documentos:', docError)
    } else {
      console.log(`Total: ${documents?.length || 0} documentos`)
      if (documents && documents.length > 0) {
        documents.forEach((doc: any) => {
          console.log(`  - ${doc.name} (Status: ${doc.status}, Chunks: ${doc.chunk_count})`)
        })
      }
    }

    // 2. Contar chunks
    console.log('\n🧩 CHUNKS (fragmentos indexados):')
    const { data: chunks, error: chunkError, count } = await supabase
      .from('document_chunks')
      .select('id', { count: 'exact' })

    if (chunkError) {
      console.error('❌ Erro ao buscar chunks:', chunkError)
    } else {
      console.log(`Total: ${count || 0} chunks`)
    }

    // 3. Verificar teaching sources
    console.log('\n📚 FONTES DE ENSINAMENTO:')
    const { data: sources, error: sourceError } = await supabase
      .from('teaching_sources')
      .select('id, name, is_active, document_count')

    if (sourceError) {
      console.error('❌ Erro ao buscar fontes:', sourceError)
    } else {
      console.log(`Total: ${sources?.length || 0} fontes`)
      if (sources && sources.length > 0) {
        sources.forEach((source: any) => {
          console.log(`  - ${source.name} (Ativa: ${source.is_active}, Docs: ${source.document_count})`)
        })
      }
    }

    // 4. Buscar por "Antaryamin"
    console.log('\n🔎 BUSCANDO "Antaryamin" nos documentos:')
    const { data: searchResults, error: searchError } = await supabase
      .from('document_chunks')
      .select('id, content, document_id')
      .ilike('content', '%antaryamin%')
      .limit(5)

    if (searchError) {
      console.error('❌ Erro na busca:', searchError)
    } else if (searchResults && searchResults.length > 0) {
      console.log(`✅ Encontrados ${searchResults.length} resultados:`)
      searchResults.forEach((result: any, idx: number) => {
        console.log(`\n[${idx + 1}] Chunk ID: ${result.id}`)
        console.log(`    Conteúdo: ${result.content.substring(0, 150)}...`)
      })
    } else {
      console.log('❌ Nenhum resultado encontrado para "Antaryamin"')
    }

    // 5. Verificar se há algum conteúdo no banco
    console.log('\n📊 RESUMO GERAL:')
    const { count: totalChunks } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact' })

    const { data: indexedDocs } = await supabase
      .from('documents')
      .select('id', { count: 'exact' })
      .eq('status', 'indexed')

    console.log(`- Total de chunks: ${totalChunks || 0}`)
    console.log(`- Documentos indexados: ${indexedDocs?.length || 0}`)

    if (!totalChunks || totalChunks === 0) {
      console.log('\n⚠️  AVISO: Nenhum chunk indexado no banco!')
      console.log('   Você precisa:')
      console.log('   1. Fazer upload de documentos via admin dashboard')
      console.log('   2. Aguardar processamento (status: "indexed")')
      console.log('   3. Os chunks serão criados e embeddings gerados')
    }
  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

checkDatabase()
