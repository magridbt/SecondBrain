import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generalRateLimiter, getRateLimitHeaders } from '@/lib/ratelimit'
import { secureLog } from '@/lib/logger'

// Schema for document ID validation
const DocumentIdSchema = z.string().uuid('Invalid document ID')

// GET - Get document with chunks for viewer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const { success, limit, remaining, reset } = await generalRateLimiter.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders({ limit, remaining, reset }) }
      )
    }

    // Validate document ID
    const { id: documentId } = await params
    const validation = DocumentIdSchema.safeParse(documentId)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      )
    }

    // Get document info - using user's client (RLS policy should allow read for authenticated users)
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select(`
        id,
        name,
        storage_path,
        original_filename,
        type,
        metadata,
        chunk_count
      `)
      .eq('id', documentId)
      .is('deleted_at', null)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get all chunks for this document
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('id, content, chunk_index, metadata')
      .eq('document_id', documentId)
      .is('deleted_at', null)
      .order('chunk_index', { ascending: true })

    if (chunksError) {
      secureLog('warn', 'Chunks fetch error', { documentId, error: chunksError.message })
    }

    // Generate a signed URL for the document (valid for 1 hour)
    let storageUrl = null
    if (doc.storage_path) {
      const { data: signedUrl } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 3600) // 1 hour

      storageUrl = signedUrl?.signedUrl
    }

    return NextResponse.json({
      id: doc.id,
      name: doc.name,
      storage_path: doc.storage_path,
      storage_url: storageUrl,
      original_filename: doc.original_filename,
      type: doc.type,
      metadata: doc.metadata,
      chunk_count: doc.chunk_count,
      chunks: chunks || []
    }, { headers: getRateLimitHeaders({ limit, remaining, reset }) })
  } catch (error) {
    secureLog('error', 'Document fetch error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
