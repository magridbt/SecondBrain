import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const feedbackSchema = z.object({
  message_id: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  rating: z.enum(['like', 'dislike']).optional(),
  feedback: z.enum(['like', 'dislike']).optional(),
  comment: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  conversationId: z.string().optional(),
  module: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    let parsed: z.infer<typeof feedbackSchema>
    try {
      parsed = feedbackSchema.parse(body)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: err.message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const messageId = parsed.message_id || parsed.messageId
    const feedback = parsed.rating || parsed.feedback
    const conversationId = parsed.conversationId
    const module = parsed.module

    if (!messageId || !feedback) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
