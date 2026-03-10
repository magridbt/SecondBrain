import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { processDocument } from '@/lib/process-document'
import { syncDocumentToCoda } from '@/lib/coda'
import { logAuditAction } from '@/lib/audit'

// POST - Document upload
export async function POST(request: Request) {
  try {
    // Check authentication and if user is admin
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

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const sourceId = formData.get('source_id') as string
    const docName = formData.get('name') as string
    const metadata = formData.get('metadata') as string

    if (!file || !sourceId) {
      return NextResponse.json({ error: 'File and source are required' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const fileType = fileExt === 'pdf' ? 'pdf' : (fileExt === 'doc' || fileExt === 'docx') ? 'word' : 'text'
    // Sanitize filename: remove accents/special chars, replace spaces with hyphens
    const sanitizedName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
    const fileName = `${Date.now()}-${sanitizedName}`

    // Upload para storage usando admin client
    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: storageError } = await adminClient.storage
      .from('documents')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (storageError) {
      console.error('Storage error:', storageError)
      return NextResponse.json({ error: `Upload error: ${storageError.message}` }, { status: 500 })
    }

    // Create document record using admin client
    const { data: doc, error: dbError } = await adminClient
      .from('documents')
      .insert({
        name: docName || file.name.replace(/\.[^/.]+$/, ''),
        type: fileType,
        source_id: sourceId,
        original_filename: file.name,
        storage_path: uploadData.path,
        file_size_bytes: file.size,
        status: 'pending',
        uploaded_by: user.id,
        metadata: metadata ? JSON.parse(metadata) : {},
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB error:', dbError)
      // Try to delete file from storage if database insert failed
      await adminClient.storage.from('documents').remove([fileName])
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }

    // Get source name for Coda sync
    const { data: sourceData } = await adminClient
      .from('teaching_sources')
      .select('name')
      .eq('id', sourceId)
      .single()

    // Sync to Coda in background (creates page)
    syncDocumentToCoda({
      id: doc.id,
      name: doc.name,
      source_name: sourceData?.name || 'Unknown',
      type: doc.type,
      status: doc.status,
      metadata: doc.metadata,
      chunk_count: 0,
      created_at: doc.created_at,
    }).catch(err => console.error('Coda sync error:', err))

    // Log to audit
    logAuditAction({
      userId: user.id,
      userEmail: user.email,
      action: 'upload_document',
      entityType: 'document',
      entityId: doc.id,
      details: {
        documentName: doc.name,
        sourceName: sourceData?.name,
        fileType: fileType,
        fileSize: file.size,
        originalFilename: file.name,
      },
    }).catch(err => console.error('Audit log error:', err))

    // Process document automatically in BACKGROUND (doesn't block the upload)
    processDocument(doc.id)
      .then(result => {
        if (result.success) {
          console.log(`Document ${doc.id} processed: ${result.chunks} chunks`)
        } else {
          console.error(`Error processing document ${doc.id}: ${result.error}`)
        }
      })
      .catch(err => console.error(`Processing error: ${err.message}`))

    return NextResponse.json({
      success: true,
      document: doc,
      message: 'Document uploaded! Processing started in background.'
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - List documents
export async function GET(request: Request) {
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

    // Pagination params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Use admin client to see all documents
    const adminClient = createAdminClient()

    const { data: documents, error } = await adminClient
      .from('documents')
      .select('*, source:teaching_sources(id, name)')
      .is('deleted_at', null)
      .order('metadata->darshan_date', { ascending: false, nullsFirst: false })
      .order('metadata->program_year', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete document (soft delete document + chunks)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const now = new Date().toISOString()

    // Get document info for audit log
    const { data: docInfo } = await adminClient
      .from('documents')
      .select('name, source_id, chunk_count, teaching_sources(name)')
      .eq('id', id)
      .single()

    // Soft delete all chunks associated with this document
    const { error: chunksError } = await adminClient
      .from('document_chunks')
      .update({ deleted_at: now })
      .eq('document_id', id)

    if (chunksError) {
      console.error('Error soft deleting chunks:', chunksError)
    }

    // Soft delete the document
    const { error } = await adminClient
      .from('documents')
      .update({ deleted_at: now })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log to audit
    await logAuditAction({
      userId: user.id,
      userEmail: user.email,
      action: 'delete_document',
      entityType: 'document',
      entityId: id,
      details: {
        documentName: docInfo?.name,
        sourceName: (docInfo?.teaching_sources as any)?.name,
        chunkCount: docInfo?.chunk_count,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
