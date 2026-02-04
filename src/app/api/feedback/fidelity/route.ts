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
    const { messageId, fidelity, conversationId, module } = body

    if (!messageId || !fidelity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['faithful', 'partial', 'unfaithful'].includes(fidelity)) {
      return NextResponse.json({ error: 'Invalid fidelity value' }, { status: 400 })
    }

    // Check if fidelity feedback already exists
    const { data: existingFeedback } = await supabase
      .from('message_fidelity_feedback')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .single()

    if (existingFeedback) {
      // Update existing feedback
      const { error } = await supabase
        .from('message_fidelity_feedback')
        .update({
          fidelity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingFeedback.id)

      if (error) throw error
    } else {
      // Insert new feedback
      const { error } = await supabase
        .from('message_fidelity_feedback')
        .insert({
          message_id: messageId,
          user_id: user.id,
          conversation_id: conversationId || null,
          module: module || 'sri-ab-teachings',
          fidelity,
        })

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving fidelity feedback:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
