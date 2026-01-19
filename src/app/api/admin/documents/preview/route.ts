import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Get signed URL for document preview/download
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
      .select('storage_path, original_filename, type')
      .eq('id', id)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!doc.storage_path) {
      return NextResponse.json({ error: 'No file associated with this document' }, { status: 404 })
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await adminClient.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 3600) // 1 hour expiry

    if (urlError || !signedUrl) {
      return NextResponse.json({ error: 'Could not generate preview URL' }, { status: 500 })
    }

    return NextResponse.json({
      url: signedUrl.signedUrl,
      filename: doc.original_filename,
      type: doc.type
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
