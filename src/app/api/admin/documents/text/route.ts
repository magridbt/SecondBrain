import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { processTextDocument } from '@/lib/process-document'
import { syncDocumentToCoda } from '@/lib/coda'

// POST - Insert text as document
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

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { source_id, name, content, metadata } = await request.json()

    if (!source_id || !name || !content) {
      return NextResponse.json(
        { error: 'Required fields: source_id, name, content' },
        { status: 400 }
      )
    }

    if (content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Text must have at least 50 characters' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Save text content as a .txt file in storage
    const fileName = `${Date.now()}-${name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
    const textBuffer = new TextEncoder().encode(content)

    const { data: uploadData, error: storageError } = await adminClient.storage
      .from('documents')
      .upload(fileName, textBuffer, {
        contentType: 'text/plain; charset=utf-8',
        upsert: false
      })

    if (storageError) {
      console.error('Storage error:', storageError)
      return NextResponse.json({ error: `Storage error: ${storageError.message}` }, { status: 500 })
    }

    // Create document record with file in storage
    const { data: doc, error: insertError } = await adminClient
      .from('documents')
      .insert({
        name,
        source_id,
        type: 'text',
        storage_path: uploadData.path, // Agora tem arquivo no storage
        original_filename: `${name}.txt`,
        file_size_bytes: textBuffer.length,
        status: 'pending',
        uploaded_by: user.id,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      // Delete uploaded file if database insert fails
      await adminClient.storage.from('documents').remove([fileName])
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Get source name for Coda sync
    const { data: sourceData } = await adminClient
      .from('teaching_sources')
      .select('name')
      .eq('id', source_id)
      .single()

    // Sync to Coda in background (creates page with content)
    syncDocumentToCoda({
      id: doc.id,
      name: doc.name,
      source_name: sourceData?.name || 'Unknown',
      type: 'text',
      status: doc.status,
      metadata: doc.metadata,
      chunk_count: 0,
      created_at: doc.created_at,
      content: content, // Include the text content for the Coda page
    }).catch(err => console.error('Coda sync error:', err))

    // Process text automatically in BACKGROUND
    processTextDocument(doc.id, content)
      .then(result => {
        console.log(`Text document ${doc.id} processed:`, result)
      })
      .catch(err => {
        console.error(`Error processing text document ${doc.id}:`, err)
      })

    return NextResponse.json({
      success: true,
      document: doc,
      message: 'Text inserted! Processing started automatically.',
    })

  } catch (error: any) {
    console.error('Text upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
