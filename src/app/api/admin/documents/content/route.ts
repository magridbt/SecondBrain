import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Get actual text content of a document
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

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get document info
    const { data: doc, error: docError } = await adminClient
      .from('documents')
      .select('storage_path, original_filename, type, name')
      .eq('id', id)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!doc.storage_path) {
      return NextResponse.json({ error: 'No file associated with this document' }, { status: 404 })
    }

    // Download the file content
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('documents')
      .download(doc.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Could not download file content' }, { status: 500 })
    }

    // Convert blob to text
    const textContent = await fileData.text()

    return NextResponse.json({
      content: textContent,
      filename: doc.original_filename || doc.name,
      type: doc.type
    })
  } catch (error) {
    console.error('Content fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
