import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const documentId = params.id

    // Fetch full document with all chunks
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(`
        id,
        name,
        status,
        metadata,
        created_at,
        teaching_sources (
          id,
          name
        ),
        document_chunks (
          id,
          content,
          metadata,
          chunk_index
        )
      `)
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Reconstruct full content from chunks
    const chunks = (document.document_chunks || [])
      .sort((a: any, b: any) => (a.chunk_index || 0) - (b.chunk_index || 0))
      .map((chunk: any) => chunk.content)
      .join('\n\n')

    return NextResponse.json({
      id: document.id,
      name: document.name,
      source: document.teaching_sources?.name || 'Unknown',
      date: document.metadata?.darshan_date,
      content: chunks,
      metadata: document.metadata,
      chunkCount: (document.document_chunks || []).length,
    })

  } catch (error) {
    console.error('Document fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
