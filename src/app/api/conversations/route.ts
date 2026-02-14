import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAuditAction } from '@/lib/audit'

// POST - Criar nova conversa com primeira mensagem
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { messages } = await request.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Mensagens obrigatorias' }, { status: 400 })
    }

    // Criar nova conversa
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        module: 'sri_ab_teachings',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (convError) throw convError

    // Salvar mensagens
    const messagesToInsert = messages.map((msg: any) => ({
      conversation_id: conv.id,
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

    return NextResponse.json({
      conversation: {
        id: conv.id,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        messageCount: messages.length,
      }
    })
  } catch (error: any) {
    console.error('Create conversation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - Listar conversas do usuario
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        created_at,
        updated_at,
        messages (
          id,
          content,
          role,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('module', 'sri_ab_teachings')
      .is('deleted_at', null) // Ignorar conversas deletadas
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) throw error

    // Formatar conversas com titulo (primeira mensagem do usuario)
    const formattedConversations = conversations?.map(conv => {
      const firstUserMessage = conv.messages
        ?.filter((m: any) => m.role === 'user')
        ?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]

      return {
        id: conv.id,
        title: firstUserMessage?.content?.substring(0, 50) + (firstUserMessage?.content?.length > 50 ? '...' : '') || 'Nova conversa',
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        messageCount: conv.messages?.length || 0,
      }
    }) || []

    return NextResponse.json({ conversations: formattedConversations })
  } catch (error: any) {
    console.error('Conversations error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Deletar uma conversa (soft delete)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('id')

    if (!conversationId) {
      return NextResponse.json({ error: 'ID da conversa e obrigatorio' }, { status: 400 })
    }

    // Verificar se a conversa pertence ao usuario
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, messages(id, content, role)')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (!conv) {
      return NextResponse.json({ error: 'Conversa nao encontrada' }, { status: 404 })
    }

    const now = new Date().toISOString()

    // Soft delete das mensagens
    await supabase
      .from('messages')
      .update({ deleted_at: now })
      .eq('conversation_id', conversationId)

    // Soft delete da conversa
    const { error } = await supabase
      .from('conversations')
      .update({ deleted_at: now })
      .eq('id', conversationId)

    if (error) throw error

    // Registrar no audit log
    await logAuditAction({
      userId: user.id,
      userEmail: user.email,
      action: 'delete_conversation',
      entityType: 'conversation',
      entityId: conversationId,
      details: {
        messageCount: conv.messages?.length || 0,
        // Guardar preview das mensagens para auditoria
        messagesPreview: conv.messages?.slice(0, 5).map((m: any) => ({
          role: m.role,
          contentPreview: m.content?.substring(0, 100),
        })),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete conversation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
