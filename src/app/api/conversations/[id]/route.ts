import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Carregar mensagens de uma conversa
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const conversationId = params.id

    // Verificar se a conversa pertence ao usuario
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!conv) {
      return NextResponse.json({ error: 'Conversa nao encontrada' }, { status: 404 })
    }

    // Buscar mensagens
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, role, content, sources, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ messages: messages || [] })
  } catch (error: any) {
    console.error('Load messages error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
