#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-2'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const voyageApiKey = process.env.VOYAGE_API_KEY

if (!supabaseUrl || !supabaseServiceKey || !voyageApiKey) {
  console.error('Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOYAGE_API_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function generateEmbedding(text) {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${voyageApiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: [text],
      input_type: 'document',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Voyage AI error: ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

async function main() {
  console.log('🚀 Generating theme embeddings...\n')

  // Get all themes without embeddings
  const { data: themes, error } = await supabase
    .from('themes')
    .select('id, slug, name_en, description_en, keywords')
    .is('embedding', null)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching themes:', error)
    process.exit(1)
  }

  if (!themes || themes.length === 0) {
    console.log('✅ All themes already have embeddings!')
    return
  }

  console.log(`Found ${themes.length} themes without embeddings\n`)

  let success = 0
  let failed = 0

  for (const theme of themes) {
    try {
      // Create rich text for embedding
      const textForEmbedding = `
        ${theme.name_en}. ${theme.description_en}
        Keywords: ${(theme.keywords || []).join(', ')}
      `.trim()

      console.log(`Processing: ${theme.icon || '📚'} ${theme.name_en}...`)

      // Generate embedding
      const embedding = await generateEmbedding(textForEmbedding)

      // Save to database
      const { error: updateError } = await supabase
        .from('themes')
        .update({ embedding: `[${embedding.join(',')}]` })
        .eq('id', theme.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      console.log(`  ✅ Done (${embedding.length} dimensions)`)
      success++

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}`)
      failed++
    }
  }

  console.log(`\n🎉 Complete! Success: ${success}, Failed: ${failed}`)
}

main().catch(console.error)
