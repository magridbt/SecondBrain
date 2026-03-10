import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST - Adicionar mensagens a uma conversa existente
export async function POST(
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
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const { messages } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Mensagens obrigatorias' }, { status: 400 })
    }

    // Verificar se a conversa pertence ao usuario
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (!conv) {
      return NextResponse.json({ error: 'Conversa nao encontrada' }, { status: 404 })
    }

    // Salvar mensagens
    const messagesToInsert = messages.map((msg: any) => ({
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content,
      sources: msg.sources || null,
      search_query: msg.searchQuery || null,
      created_at: msg.created_at || new Date().toISOString(),
    }))

    const { error: msgError } = await supabase
      .from('messages')
      .insert(messagesToInsert)

    if (msgError) throw msgError

    // Atualizar updated_at da conversa
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    return NextResponse.json({ success: true, messageCount: messages.length })
  } catch (error) {
    console.error('Add messages error:', error)
    return NextResponse.json({ error: 'Failed to add messages' }, { status: 500 })
  }
}

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
  } catch (error) {
    console.error('Load messages error:', error)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}
