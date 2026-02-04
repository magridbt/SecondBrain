import { createAdminClient } from '@/lib/supabase/server'

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-2'

// Minimum similarity threshold for theme classification
const THEME_SIMILARITY_THRESHOLD = 0.35
const MAX_THEMES_PER_DOCUMENT = 3

interface ThemeWithEmbedding {
  id: string
  slug: string
  name_pt: string
  name_en: string
  description_en: string
  embedding: number[] | null
}

interface ClassifiedTheme {
  id: string
  slug: string
  name: string
  confidence: number
}

interface VoyageEmbeddingResponse {
  data: Array<{
    embedding: number[]
  }>
}

interface DocumentThemeRow {
  confidence: number
  themes: {
    id: string
    slug: string
    name_pt: string
    name_en: string
  }
}

// Cache for theme embeddings (loaded once per process)
let themesCache: ThemeWithEmbedding[] | null = null

// Generate embedding using Voyage AI
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
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

  const data = await response.json() as VoyageEmbeddingResponse
  return data.data[0].embedding
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  return magnitude === 0 ? 0 : dotProduct / magnitude
}

// Load themes from database (with caching)
async function loadThemes(): Promise<ThemeWithEmbedding[]> {
  if (themesCache) return themesCache

  const adminClient = createAdminClient()

  const { data: themes, error } = await adminClient
    .from('themes')
    .select('id, slug, name_pt, name_en, description_en, embedding')
    .eq('is_active', true)
    .order('display_order')

  if (error) {
    console.error('Error loading themes:', error)
    return []
  }

  themesCache = themes || []
  return themesCache
}

// Generate and save embedding for a theme
export async function generateThemeEmbedding(themeId: string): Promise<void> {
  const adminClient = createAdminClient()

  // Get theme data
  const { data: theme, error: fetchError } = await adminClient
    .from('themes')
    .select('slug, name_en, description_en, keywords')
    .eq('id', themeId)
    .single()

  if (fetchError || !theme) {
    throw new Error(`Theme not found: ${themeId}`)
  }

  // Create rich text for embedding
  const textForEmbedding = `
    ${theme.name_en}. ${theme.description_en}
    Keywords: ${(theme.keywords || []).join(', ')}
  `.trim()

  // Generate embedding
  const embedding = await generateEmbedding(textForEmbedding)

  // Save to database
  const { error: updateError } = await adminClient
    .from('themes')
    .update({ embedding: `[${embedding.join(',')}]` })
    .eq('id', themeId)

  if (updateError) {
    throw new Error(`Failed to save theme embedding: ${updateError.message}`)
  }

  // Clear cache
  themesCache = null
}

// Generate embeddings for all themes without one
export async function generateAllThemeEmbeddings(): Promise<{ success: number; failed: number }> {
  const adminClient = createAdminClient()

  const { data: themes, error } = await adminClient
    .from('themes')
    .select('id, slug')
    .is('embedding', null)
    .eq('is_active', true)

  if (error || !themes) {
    return { success: 0, failed: 0 }
  }

  let success = 0
  let failed = 0

  for (const theme of themes) {
    try {
      await generateThemeEmbedding(theme.id)
      console.log(`Generated embedding for theme: ${theme.slug}`)
      success++
    } catch (err) {
      console.error(`Failed to generate embedding for ${theme.slug}:`, err)
      failed++
    }
  }

  // Clear cache after generating all
  themesCache = null

  return { success, failed }
}

// Classify document content into themes
export async function classifyDocument(
  documentContent: string,
  documentEmbedding?: number[]
): Promise<ClassifiedTheme[]> {
  const themes = await loadThemes()

  if (themes.length === 0) {
    console.warn('No themes found for classification')
    return []
  }

  // Use provided embedding or generate new one
  let contentEmbedding = documentEmbedding
  if (!contentEmbedding) {
    // Use first 5000 chars for classification
    const textForClassification = documentContent.substring(0, 5000)
    contentEmbedding = await generateEmbedding(textForClassification)
  }

  // Calculate similarity with each theme
  const classifications: ClassifiedTheme[] = []

  for (const theme of themes) {
    if (!theme.embedding) continue

    // Parse embedding if it's a string (from Supabase)
    let themeEmbedding: number[]
    if (typeof theme.embedding === 'string') {
      themeEmbedding = JSON.parse(theme.embedding)
    } else if (Array.isArray(theme.embedding)) {
      themeEmbedding = theme.embedding
    } else {
      continue
    }

    const similarity = cosineSimilarity(contentEmbedding, themeEmbedding)

    if (similarity >= THEME_SIMILARITY_THRESHOLD) {
      classifications.push({
        id: theme.id,
        slug: theme.slug,
        name: theme.name_en,
        confidence: similarity,
      })
    }
  }

  // Sort by confidence and take top N
  return classifications
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_THEMES_PER_DOCUMENT)
}

// Save document themes to database
export async function saveDocumentThemes(
  documentId: string,
  themes: ClassifiedTheme[]
): Promise<void> {
  const adminClient = createAdminClient()

  // Delete existing themes for this document
  await adminClient
    .from('document_themes')
    .delete()
    .eq('document_id', documentId)

  if (themes.length === 0) return

  // Insert new themes
  const records = themes.map(theme => ({
    document_id: documentId,
    theme_id: theme.id,
    confidence: theme.confidence,
  }))

  const { error } = await adminClient
    .from('document_themes')
    .insert(records)

  if (error) {
    console.error('Error saving document themes:', error)
  }
}

// Classify and save themes for a document
export async function classifyAndSaveDocumentThemes(
  documentId: string,
  documentContent: string,
  documentEmbedding?: number[]
): Promise<ClassifiedTheme[]> {
  const themes = await classifyDocument(documentContent, documentEmbedding)
  await saveDocumentThemes(documentId, themes)

  console.log(`Document ${documentId} classified into themes:`, themes.map(t => t.slug).join(', ') || 'none')

  return themes
}

// Get themes for a document
export async function getDocumentThemes(documentId: string): Promise<ClassifiedTheme[]> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('document_themes')
    .select(`
      confidence,
      themes (
        id,
        slug,
        name_pt,
        name_en
      )
    `)
    .eq('document_id', documentId)

  if (error || !data) return []

  return (data as unknown as DocumentThemeRow[]).map((item) => ({
    id: item.themes.id,
    slug: item.themes.slug,
    name: item.themes.name_en,
    confidence: item.confidence,
  }))
}

// Get all active themes (for UI)
export async function getAllThemes(): Promise<{
  id: string
  slug: string
  name_pt: string
  name_en: string
  name_es: string | null
  icon: string
  color: string
}[]> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('themes')
    .select('id, slug, name_pt, name_en, name_es, icon, color')
    .eq('is_active', true)
    .order('display_order')

  if (error) {
    console.error('Error fetching themes:', error)
    return []
  }

  return data || []
}

// Clear theme cache (call when themes are updated)
export function clearThemeCache(): void {
  themesCache = null
}
