import { createAdminClient } from '@/lib/supabase/server'
import { updateCodaStatus } from '@/lib/coda'

// Configuration
const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-2'

// Split text into chunks
function splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)

    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastPeriod, lastNewline)

      if (breakPoint > chunkSize * 0.5) {
        chunk = chunk.slice(0, breakPoint + 1)
      }
    }

    chunks.push(chunk.trim())
    start = start + chunk.length - overlap

    if (start >= text.length - overlap) break
  }

  return chunks.filter(c => c.length > 50)
}

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Generate embeddings with Voyage AI (with retry and rate limit)
async function generateEmbeddings(texts: string[], retryCount = 0): Promise<number[][]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: texts,
      input_type: 'document',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()

    // If rate limited, wait and try again
    if (response.status === 429 && retryCount < 5) {
      console.log(`Rate limit hit, waiting 3 seconds... (attempt ${retryCount + 1})`)
      await delay(3000) // Wait 3 seconds (paid plan has higher limits)
      return generateEmbeddings(texts, retryCount + 1)
    }

    throw new Error(`Voyage AI error: ${errorText}`)
  }

  const data = await response.json()
  return data.data.map((item: any) => item.embedding)
}

// Extract text from PDF using unpdf (optimized for server)
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { extractText } = await import('unpdf')

  // Convert Buffer to Uint8Array
  const uint8Array = new Uint8Array(buffer)
  const result = await extractText(uint8Array)

  // Ensure text is a string
  const text = result.text || ''
  if (typeof text !== 'string') {
    // If array of pages, join them
    if (Array.isArray(text)) {
      return text.join('\n')
    }
    return String(text)
  }
  return text
}

// Extract text from Word documents (.docx)
async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value || ''
}

// Main processing function
export async function processDocument(documentId: string): Promise<{ success: boolean; chunks?: number; error?: string }> {
  const adminClient = createAdminClient()

  try {
    // Fetch document
    const { data: doc, error: docError } = await adminClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return { success: false, error: 'Document not found' }
    }

    if (doc.status === 'indexed') {
      return { success: false, error: 'Document already processed' }
    }

    // Update status to processing
    await adminClient
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)

    // Download file from storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('documents')
      .download(doc.storage_path)

    if (downloadError || !fileData) {
      throw new Error(`Error downloading file: ${downloadError?.message}`)
    }

    // Extract text
    let text: string
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const fileName = doc.storage_path?.toLowerCase() || ''

    if (doc.type === 'pdf' || fileName.endsWith('.pdf')) {
      text = await extractTextFromPdf(buffer)
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      text = await extractTextFromWord(buffer)
    } else {
      text = buffer.toString('utf-8')
    }

    if (!text || text.trim().length < 50) {
      throw new Error('Empty document or insufficient content')
    }

    // Split into chunks
    const chunks = splitTextIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP)

    if (chunks.length === 0) {
      throw new Error('Could not extract chunks from document')
    }

    // Generate embeddings in batches (paid plan = higher limits)
    const BATCH_SIZE = 20 // Larger batches with paid plan
    const allEmbeddings: number[][] = []

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const embeddings = await generateEmbeddings(batch)
      allEmbeddings.push(...embeddings)

      // Minimal delay between batches (paid plan)
      if (i + BATCH_SIZE < chunks.length) {
        console.log(`Processed ${i + BATCH_SIZE}/${chunks.length} chunks...`)
        await delay(500) // 0.5 seconds between batches
      }
    }

    // FIX 1.3: Validate embeddings before storage
    console.log('🔍 Validating embeddings before storage...')
    for (let i = 0; i < allEmbeddings.length; i++) {
      if (!allEmbeddings[i] || !Array.isArray(allEmbeddings[i])) {
        throw new Error(`❌ Embedding ${i} is invalid (not an array) - storage aborted`)
      }
      if (allEmbeddings[i].length !== 1024) {
        throw new Error(`❌ Embedding ${i} has wrong dimension: ${allEmbeddings[i].length} (expected 1024) - storage aborted`)
      }
      for (const value of allEmbeddings[i]) {
        if (!Number.isFinite(value)) {
          throw new Error(`❌ Embedding ${i} contains invalid value: ${value} (NaN or Infinity) - storage aborted`)
        }
      }
    }
    console.log(`✅ Embeddings validation passed: ${allEmbeddings.length} embeddings × 1024 dimensions`)

    // Save chunks to database
    // FIX 1.2: Store embedding as string - database expects: "[0.1, 0.2, ...]"
    const chunkRecords = chunks.map((content, index) => ({
      document_id: documentId,
      content,
      embedding: `[${allEmbeddings[index].join(',')}]`,  // String format for database
      chunk_index: index,
      token_count: Math.ceil(content.length / 4),
      metadata: {
        ...doc.metadata,
        chunk_of: chunks.length,
      },
    }))

    // Delete old chunks
    await adminClient
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)

    // Insert new chunks
    const { error: insertError } = await adminClient
      .from('document_chunks')
      .insert(chunkRecords)

    if (insertError) {
      throw new Error(`Error saving chunks: ${insertError.message}`)
    }

    // Update document as indexed
    await adminClient
      .from('documents')
      .update({
        status: 'indexed',
        chunk_count: chunks.length,
      })
      .eq('id', documentId)

    // Update Coda status
    updateCodaStatus(documentId, 'indexed', chunks.length).catch(err =>
      console.error('Coda status update error:', err)
    )

    return { success: true, chunks: chunks.length }

  } catch (error: any) {
    // In case of error, update status
    await adminClient
      .from('documents')
      .update({
        status: 'error',
        error_message: error.message,
      })
      .eq('id', documentId)

    // Update Coda status on error
    updateCodaStatus(documentId, 'error').catch(err =>
      console.error('Coda status update error:', err)
    )

    return { success: false, error: error.message }
  }
}

// Function to process direct text (no file)
export async function processTextDocument(documentId: string, text: string): Promise<{ success: boolean; chunks?: number; error?: string }> {
  const adminClient = createAdminClient()

  try {
    // Update status to processing
    await adminClient
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)

    if (!text || text.trim().length < 50) {
      throw new Error('Empty text or insufficient content')
    }

    // Split into chunks
    const chunks = splitTextIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP)

    if (chunks.length === 0) {
      throw new Error('Could not extract chunks from text')
    }

    // Generate embeddings in batches (paid plan = higher limits)
    const BATCH_SIZE = 20
    const allEmbeddings: number[][] = []

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const embeddings = await generateEmbeddings(batch)
      allEmbeddings.push(...embeddings)

      // Minimal delay between batches (paid plan)
      if (i + BATCH_SIZE < chunks.length) {
        console.log(`Processed ${i + BATCH_SIZE}/${chunks.length} chunks...`)
        await delay(500)
      }
    }

    // FIX 1.3: Validate embeddings before storage
    console.log('🔍 Validating embeddings before storage...')
    for (let i = 0; i < allEmbeddings.length; i++) {
      if (!allEmbeddings[i] || !Array.isArray(allEmbeddings[i])) {
        throw new Error(`❌ Embedding ${i} is invalid (not an array) - storage aborted`)
      }
      if (allEmbeddings[i].length !== 1024) {
        throw new Error(`❌ Embedding ${i} has wrong dimension: ${allEmbeddings[i].length} (expected 1024) - storage aborted`)
      }
      for (const value of allEmbeddings[i]) {
        if (!Number.isFinite(value)) {
          throw new Error(`❌ Embedding ${i} contains invalid value: ${value} (NaN or Infinity) - storage aborted`)
        }
      }
    }
    console.log(`✅ Embeddings validation passed: ${allEmbeddings.length} embeddings × 1024 dimensions`)

    // Fetch document metadata
    const { data: doc } = await adminClient
      .from('documents')
      .select('metadata')
      .eq('id', documentId)
      .single()

    // Save chunks to database
    // FIX 1.2: Store embedding as string - database expects: "[0.1, 0.2, ...]"
    const chunkRecords = chunks.map((content, index) => ({
      document_id: documentId,
      content,
      embedding: `[${allEmbeddings[index].join(',')}]`,  // String format for database
      chunk_index: index,
      token_count: Math.ceil(content.length / 4),
      metadata: {
        ...doc?.metadata,
        chunk_of: chunks.length,
      },
    }))

    // Delete old chunks
    await adminClient
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)

    // Insert new chunks
    const { error: insertError } = await adminClient
      .from('document_chunks')
      .insert(chunkRecords)

    if (insertError) {
      throw new Error(`Error saving chunks: ${insertError.message}`)
    }

    // Update document as indexed
    await adminClient
      .from('documents')
      .update({
        status: 'indexed',
        chunk_count: chunks.length,
      })
      .eq('id', documentId)

    // Update Coda status
    updateCodaStatus(documentId, 'indexed', chunks.length).catch(err =>
      console.error('Coda status update error:', err)
    )

    return { success: true, chunks: chunks.length }

  } catch (error: any) {
    // In case of error, update status
    await adminClient
      .from('documents')
      .update({
        status: 'error',
        error_message: error.message,
      })
      .eq('id', documentId)

    // Update Coda status on error
    updateCodaStatus(documentId, 'error').catch(err =>
      console.error('Coda status update error:', err)
    )

    return { success: false, error: error.message }
  }
}
