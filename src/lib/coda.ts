// Coda API Integration for Sri AB Teachings
// Syncs teachings to Coda document - creates pages and updates table

const CODA_API_BASE = 'https://coda.io/apis/v1'
const CODA_API_TOKEN = process.env.CODA_API_TOKEN
const CODA_DOC_ID = process.env.CODA_DOC_ID

// Cache for table ID
let TEACHINGS_TABLE_ID: string | null = null

interface TeachingData {
  id: string
  name: string
  source: string
  type: string
  status: string
  language?: string
  programYear?: string
  darshanDate?: string
  chunkCount?: number
  content?: string
  createdAt: string
}

async function codaFetch(endpoint: string, options: RequestInit = {}) {
  if (!CODA_API_TOKEN) {
    console.log('CODA_API_TOKEN not configured')
    return null
  }

  try {
    const response = await fetch(`${CODA_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${CODA_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Coda API error: ${response.status} - ${error}`)
      return null
    }

    return response.json()
  } catch (error) {
    console.error('Coda fetch error:', error)
    return null
  }
}

// Table ID for Sri_AB_Teachings (hardcoded for performance)
const SRI_AB_TABLE_ID = 'grid-plGSY-6yqB'
const SRI_AB_PAGE_ID = 'canvas-3flGuJAQRk'

// Section pages for each source type
const SOURCE_SECTION_PAGES: Record<string, string> = {
  '81000': 'canvas-H4HCvvdSoP',           // 81000 Deeksha Yajna Program
  'kalki': 'canvas-Zn2KMkh-VM',           // Kalki Dharma Videos
  'sri ab original': 'canvas-OBRSTMSsN8', // Sri AB Original Teachings
  'tejasa': 'canvas-PrhGIBu4GR',          // Tejasaji
}

// Find the Sri_AB_Teachings table
async function findTeachingsTable(): Promise<string | null> {
  if (TEACHINGS_TABLE_ID) return TEACHINGS_TABLE_ID

  // Use hardcoded ID first (faster)
  TEACHINGS_TABLE_ID = SRI_AB_TABLE_ID
  return TEACHINGS_TABLE_ID
}

// Find the parent page for a teaching based on its source
function findSectionPageForSource(sourceName: string): string {
  const sourceNameLower = sourceName.toLowerCase()

  for (const [key, pageId] of Object.entries(SOURCE_SECTION_PAGES)) {
    if (sourceNameLower.includes(key)) {
      return pageId
    }
  }

  // Default to main Sri AB Teachings page if no match
  return SRI_AB_PAGE_ID
}

// Create a new page for a teaching with its content
export async function createTeachingPage(teaching: TeachingData): Promise<string | null> {
  if (!CODA_API_TOKEN || !CODA_DOC_ID) {
    console.log('Coda not configured, skipping page creation')
    return null
  }

  try {
    // Find the correct section page based on the source
    const parentPageId = findSectionPageForSource(teaching.source)

    // Build subtitle with metadata
    const subtitleParts = [teaching.source]
    if (teaching.language) {
      const langMap: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }
      subtitleParts.push(langMap[teaching.language] || teaching.language)
    }
    if (teaching.programYear) {
      subtitleParts.push(teaching.programYear.replace('ano', 'Year ').replace('_', ' - '))
    }
    if (teaching.darshanDate) {
      subtitleParts.push(teaching.darshanDate)
    }

    const body: any = {
      name: teaching.name,
      subtitle: subtitleParts.join(' | '),
    }

    // Add parent page if found
    if (parentPageId) {
      body.parentPageId = parentPageId
    }

    const page = await codaFetch(`/docs/${CODA_DOC_ID}/pages`, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    if (page?.id) {
      console.log(`Created Coda page for: ${teaching.name}`)
      // Build the browser link
      const pageIdClean = page.id.replace('canvas-', '')
      return page.browserLink || `https://coda.io/d/_d${CODA_DOC_ID}/_su${pageIdClean}`
    }

    return null
  } catch (error) {
    console.error('Error creating Coda page:', error)
    return null
  }
}

// Add or update a teaching in the table
export async function syncTeachingToTable(teaching: TeachingData, pageLink?: string | null): Promise<boolean> {
  if (!CODA_API_TOKEN || !CODA_DOC_ID) {
    console.log('Coda not configured, skipping table sync')
    return false
  }

  try {
    const tableId = await findTeachingsTable()
    if (!tableId) {
      console.log('Teachings table not found, skipping table sync')
      return false
    }

    // Use upsert to add or update the row
    const result = await codaFetch(`/docs/${CODA_DOC_ID}/tables/${tableId}/rows`, {
      method: 'POST',
      body: JSON.stringify({
        rows: [{
          cells: [
            { column: 'SecondBrain_ID', value: teaching.id },
            { column: 'Name', value: teaching.name },
            { column: 'Source', value: teaching.source },
            { column: 'Type', value: teaching.type },
            { column: 'Status', value: teaching.status },
            { column: 'Language', value: teaching.language || '' },
            { column: 'Program_Year', value: teaching.programYear || '' },
            { column: 'Darshan_Date', value: teaching.darshanDate || '' },
            { column: 'Chunk_Count', value: teaching.chunkCount || 0 },
            { column: 'Created_At', value: teaching.createdAt },
            { column: 'Page_Link', value: pageLink || '' },
          ]
        }],
        keyColumns: ['SecondBrain_ID']
      }),
    })

    if (result) {
      console.log(`Synced to Coda table: ${teaching.name}`)
      return true
    }
    return false
  } catch (error) {
    console.error('Error syncing to Coda table:', error)
    return false
  }
}

// Main function to sync a document to Coda (page + optional table)
export async function syncDocumentToCoda(document: {
  id: string
  name: string
  source_name: string
  type: string
  status: string
  metadata?: any
  chunk_count?: number
  created_at: string
  content?: string
}): Promise<{ pageLink: string | null; tableSync: boolean }> {
  if (!CODA_API_TOKEN || !CODA_DOC_ID) {
    console.log('Coda integration not configured, skipping sync')
    return { pageLink: null, tableSync: false }
  }

  const teaching: TeachingData = {
    id: document.id,
    name: document.name,
    source: document.source_name,
    type: document.type,
    status: document.status,
    language: document.metadata?.language,
    programYear: document.metadata?.program_year,
    darshanDate: document.metadata?.darshan_date,
    chunkCount: document.chunk_count,
    content: document.content,
    createdAt: document.created_at,
  }

  // Create page for the teaching
  const pageLink = await createTeachingPage(teaching)

  // Try to add/update row in the table
  const tableSync = await syncTeachingToTable(teaching, pageLink)

  console.log(`Coda sync complete for "${document.name}" - Page: ${pageLink ? 'created' : 'failed'}, Table: ${tableSync ? 'synced' : 'skipped'}`)

  return { pageLink, tableSync }
}

// Update status in Coda when document processing completes
export async function updateCodaStatus(documentId: string, status: string, chunkCount?: number): Promise<void> {
  if (!CODA_API_TOKEN || !CODA_DOC_ID) return

  try {
    const tableId = await findTeachingsTable()
    if (!tableId) return

    // Find the row
    const rows = await codaFetch(
      `/docs/${CODA_DOC_ID}/tables/${tableId}/rows?query=SecondBrain_ID:"${documentId}"`
    )

    if (rows?.items && rows.items.length > 0) {
      const rowId = rows.items[0].id
      const cells: any[] = [{ column: 'Status', value: status }]

      if (chunkCount !== undefined) {
        cells.push({ column: 'Chunk_Count', value: chunkCount })
      }

      await codaFetch(`/docs/${CODA_DOC_ID}/tables/${tableId}/rows/${rowId}`, {
        method: 'PUT',
        body: JSON.stringify({ row: { cells } }),
      })
      console.log(`Updated Coda status: ${documentId} -> ${status}`)
    }
  } catch (error) {
    console.error('Error updating Coda status:', error)
  }
}

// Check if Coda integration is configured
export function isCodaConfigured(): boolean {
  return !!(CODA_API_TOKEN && CODA_DOC_ID)
}
