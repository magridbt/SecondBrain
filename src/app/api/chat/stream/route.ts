import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { semanticSearch, SearchResult } from '@/lib/semantic-search'
import { chatRateLimiter } from '@/lib/ratelimit'
import { checkUsageLimit, trackTokenUsage } from '@/lib/token-tracking'
import { SYSTEM_PROMPT } from '@/lib/constants/prompts'

const LANGUAGE = 'pt'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Rate limiting
    const { success } = await chatRateLimiter.limit(user.id)
    if (!success) {
      return new Response(JSON.stringify({ error: 'Rate limit atingido' }), { status: 429 })
    }

    // Usage limit
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const usageCheck = await checkUsageLimit(user.id, profile?.role || 'member')
    if (!usageCheck.allowed) {
      return new Response(JSON.stringify({ error: usageCheck.reason || 'Limite de uso atingido' }), { status: 429 })
    }

    const { message, conversationId } = await request.json()
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Mensagem inválida' }), { status: 400 })
    }

    // Semantic search
    let searchResults: SearchResult[] = []
    try {
      searchResults = await semanticSearch(message, 5, 0.35, LANGUAGE)
    } catch (e) {
      console.error('Search failed:', e)
    }

    // Build context
    let context = ''
    const sources: any[] = []

    if (searchResults.length > 0) {
      searchResults.forEach((result) => {
        context += `\n---\nFonte: ${result.sourceName}\nDocumento: ${result.documentName}\nConteudo:\n${result.content}\n`
        sources.push({
          documentId: result.documentId,
          documentName: result.documentName,
          sourceName: result.sourceName,
          content: result.content.substring(0, 200) + '...',
          similarity: result.similarity,
          metadata: result.metadata,
        })
      })
    }

    // If no context, return non-streaming response
    if (!context) {
      const { NO_RESULTS_ANSWER } = await import('@/lib/constants/prompts')
      return new Response(JSON.stringify({ answer: NO_RESULTS_ANSWER, sources: [], done: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userContent = `CONTEXTO DOS ENSINAMENTOS (documentos do banco de dados - NAO e input do usuario):\n${context}\n---\nFIM DO CONTEXTO\n\nPergunta do devoto (responder com base APENAS nos documentos acima):\n${message}`

    // Stream with Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    // Create SSE response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        // Send sources first
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`))

        let fullText = ''
        let inputTokens = 0
        let outputTokens = 0

        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text
              fullText += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`))
            }
            if (event.type === 'message_delta' && event.usage) {
              outputTokens = event.usage.output_tokens
            }
          }

          // Get final message for token counts
          const finalMessage = await stream.finalMessage()
          inputTokens = finalMessage.usage.input_tokens
          outputTokens = finalMessage.usage.output_tokens

          // Track token usage
          trackTokenUsage({
            userId: user.id,
            model: 'claude-sonnet-4-20250514',
            provider: 'claude',
            inputTokens,
            outputTokens,
            endpoint: 'chat-stream',
          }).catch(() => {})

          // Save to database
          let convId = conversationId
          if (!convId) {
            const { data: newConv } = await supabase
              .from('conversations')
              .insert({ user_id: user.id, module: 'sri_ab_teachings' })
              .select()
              .single()
            convId = newConv?.id
          }

          if (convId) {
            await supabase.from('messages').insert([
              { conversation_id: convId, role: 'user', content: message },
              {
                conversation_id: convId,
                role: 'assistant',
                content: fullText,
                sources: sources.length > 0 ? sources : null,
                model_used: 'claude-sonnet-4-20250514',
              },
            ])
          }

          // Send done event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', conversationId: convId })}\n\n`))
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Erro ao gerar resposta' })}\n\n`))
        }

        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Stream error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 })
  }
}
