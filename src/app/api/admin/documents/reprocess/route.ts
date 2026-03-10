import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { processDocument } from '@/lib/process-document'

// POST - Reprocess all pending documents or a specific document
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const body = await request.json().catch(() => ({}))
    const { documentId } = body

    if (documentId) {
      // Reprocess single document
      // First, reset status to pending
      await adminClient
        .from('documents')
        .update({ status: 'pending', error_message: null })
        .eq('id', documentId)

      // Delete existing chunks
      await adminClient
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId)

      // Process in background
      processDocument(documentId)
        .then(result => {
          console.log(`Document ${documentId} reprocessed:`, result)
        })
        .catch(err => {
          console.error(`Error reprocessing document ${documentId}:`, err)
        })

      return NextResponse.json({
        success: true,
        message: 'Document reprocessing started',
        documentId
      })
    } else {
      // Reprocess all pending/error documents
      const { data: documents, error } = await adminClient
        .from('documents')
        .select('id')
        .in('status', ['pending', 'error'])
        .is('deleted_at', null)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      if (!documents || documents.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No documents to reprocess',
          count: 0
        })
      }

      // Process all documents in background
      let processed = 0
      for (const doc of documents) {
        // Delete existing chunks
        await adminClient
          .from('document_chunks')
          .delete()
          .eq('document_id', doc.id)

        // Process document
        processDocument(doc.id)
          .then(result => {
            console.log(`Document ${doc.id} reprocessed:`, result)
          })
          .catch(err => {
            console.error(`Error reprocessing document ${doc.id}:`, err)
          })

        processed++
      }

      return NextResponse.json({
        success: true,
        message: `Started reprocessing ${processed} documents`,
        count: processed
      })
    }
  } catch (error) {
    console.error('Reprocess error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
