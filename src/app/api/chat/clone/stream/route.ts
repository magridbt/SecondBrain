import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { semanticSearch, SearchResult } from '@/lib/semantic-search'
import { chatRateLimiter } from '@/lib/ratelimit'
import { checkUsageLimit, trackTokenUsageWithRetry } from '@/lib/token-tracking'
import { CLONE_SYSTEM_PROMPT } from '@/lib/constants/prompts'

const LANGUAGE = 'pt'
const MAX_MESSAGE_LENGTH = 5000
const STREAM_TIMEOUT_MS = 60000

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

    // Input validation
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'JSON invalido' }), { status: 400 })
    }

    const { message, conversationId } = body as { message?: string; conversationId?: string }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Mensagem invalida' }), { status: 400 })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({ error: `Mensagem excede o limite de ${MAX_MESSAGE_LENGTH} caracteres` }), { status: 400 })
    }
    if (conversationId && typeof conversationId !== 'string') {
      return new Response(JSON.stringify({ error: 'conversationId invalido' }), { status: 400 })
    }

    // Semantic search (RAG as optional enrichment)
    let searchResults: SearchResult[] = []
    try {
      searchResults = await semanticSearch(message, 5, 0.35, LANGUAGE)
    } catch (e) {
      console.error('Search failed:', e)
    }

    // Build context
    let context = ''

    if (searchResults.length > 0) {
      searchResults.forEach((result) => {
        context += `\n---\nFonte: ${result.sourceName}\nDocumento: ${result.documentName}\nConteudo:\n${result.content}\n`
      })
    }

    // Clone mode: always respond - with or without RAG context
    let userContent: string
    if (context) {
      userContent = `CONTEXTO DOS ENSINAMENTOS (documentos encontrados no banco de dados):\n${context}\n---\nFIM DO CONTEXTO\n\nUse estes documentos como base e enriqueca com seu DNA Mental.\n\nPergunta do devoto:\n${message}`
    } else {
      userContent = `Nenhum documento especifico encontrado no banco de dados para esta pergunta. Responda a partir do seu DNA Mental, seus padroes de pensamento e marcadores de voz.\n\nPergunta do devoto:\n${message}`
    }

    // Validate API key existence
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'Erro de configuracao do servidor' }), { status: 500 })
    }

    // Stream with Claude
    const anthropic = new Anthropic({ apiKey })

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: CLONE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    // Create SSE response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        // Clone mode: no sources sent to frontend - the clone speaks naturally

        const textChunks: string[] = []
        let inputTokens = 0
        let outputTokens = 0
        let streamTimedOut = false

        // Stream timeout
        const timeoutHandle = setTimeout(() => {
          streamTimedOut = true
          try {
            stream.abort()
          } catch {}
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Tempo limite excedido' })}\n\n`))
            controller.close()
          } catch {}
        }, STREAM_TIMEOUT_MS)

        try {
          for await (const event of stream) {
            if (streamTimedOut) break
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text
              textChunks.push(text)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`))
            }
            if (event.type === 'message_delta' && event.usage) {
              outputTokens = event.usage.output_tokens
            }
          }

          clearTimeout(timeoutHandle)
          if (streamTimedOut) return

          const fullText = textChunks.join('')

          // Get final message for token counts
          const finalMessage = await stream.finalMessage()
          inputTokens = finalMessage.usage.input_tokens
          outputTokens = finalMessage.usage.output_tokens

          // Track token usage with retry
          trackTokenUsageWithRetry({
            userId: user.id,
            model: 'claude-sonnet-4-20250514',
            provider: 'claude',
            inputTokens,
            outputTokens,
            endpoint: 'clone-stream',
          })

          // Save to database
          let convId = conversationId
          if (!convId) {
            const { data: newConv } = await supabase
              .from('conversations')
              .insert({ user_id: user.id, module: 'clone_cognitivo' })
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
                model_used: 'claude-sonnet-4-20250514',
              },
            ])
          }

          // Send done event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', conversationId: convId })}\n\n`))
        } catch (err) {
          clearTimeout(timeoutHandle)
          try { stream.abort() } catch {}
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
    console.error('Clone stream error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 })
  }
}
