import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { semanticSearch } from '@/lib/semantic-search'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { topic, limit = 10 } = await request.json()

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    // Search for teachings using semantic search in Portuguese only (35% threshold for conceptual matches)
    const finalResults = await semanticSearch(
      topic,
      Math.min(limit, 20), // Cap at 20 results
      0.35,
      'pt' // Portuguese only
    )

    // Format results for the frontend
    const formattedResults = finalResults.map((result) => ({
      id: result.id,
      content: result.content,
      documentId: result.documentId,
      documentName: result.documentName,
      sourceName: result.sourceName,
      similarity: result.similarity,
      language: result.metadata?.language || 'en',
    }))

    return NextResponse.json({ results: formattedResults })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search teachings' },
      { status: 500 }
    )
  }
}
