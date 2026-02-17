import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { messageId, feedback, conversationId, module } = body

    if (!messageId || !feedback) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['like', 'dislike'].includes(feedback)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 })
    }

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('message_feedback')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .single()

    if (existingFeedback) {
      // Update existing feedback
      const { error } = await supabase
        .from('message_feedback')
        .update({
          feedback,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingFeedback.id)

      if (error) throw error
    } else {
      // Insert new feedback
      const { error } = await supabase
        .from('message_feedback')
        .insert({
          message_id: messageId,
          user_id: user.id,
          conversation_id: conversationId || null,
          module: module || 'sri-ab-teachings',
          feedback,
        })

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving feedback:', error)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}
