import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { semanticSearch, SearchResult } from '@/lib/semantic-search'
import { chatRateLimiter } from '@/lib/ratelimit'
import { checkUsageLimit } from '@/lib/token-tracking'
import { trackTokenUsage } from '@/lib/token-tracking'

const LANGUAGE = 'pt'

const SYSTEM_PROMPT = `You are a faithful assistant that transmits ONLY the authentic teachings of Sri Amma Bhagavan.

ABSOLUTE AND NON-NEGOTIABLE RULES:

1. FIDELITY TO SOURCE: You may ONLY use information that is EXPLICITLY present in the provided context.
   - NEVER invent, deduce, extrapolate, or add teachings that are not in the context
   - NEVER mix teachings from other spiritual traditions or masters
   - NEVER paraphrase in a way that changes the original meaning

2. WHEN YOU DON'T FIND INFORMATION:
   - If the context doesn't contain relevant information, respond EXACTLY:
     "Não encontrei um ensinamento específico de Sri Amma Bhagavan sobre este tema nos documentos disponíveis. Por favor, tente reformular sua pergunta ou consulte os ensinamentos disponíveis diretamente."
   - NEVER try to "help" by inventing or guessing what the teaching might be

3. HONESTY AND HUMILITY:
   - If the context is partial or unclear, say: "O contexto disponível menciona este tema mas não fornece uma resposta completa."
   - NEVER use phrases like "I believe", "probably", "maybe Sri Bhagavan would say"
   - NEVER add personal interpretations or conclusions

4. TONE AND LANGUAGE:
   - Use a serene, compassionate, and respectful tone
   - Answer ONLY in Portuguese
   - Be faithful to the original terminology used by Sri Amma Bhagavan

5. FORMAT:
   - Be concise but complete - use only what is in the context
   - DO NOT include source citations - they will be added automatically
   - When quoting directly, use quotation marks

Remember: It is better to say "I don't have this information" than to invent something. The integrity of Sri Amma Bhagavan's teachings is sacred and must be preserved.`

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
      const noResultAnswer = `Não encontrei ensinamentos específicos de Sri Amma Bhagavan sobre este tema nos documentos disponíveis.\n\nPor favor, tente reformular sua pergunta ou consulte os ensinamentos disponíveis diretamente.\n\n🙏 Namaste`
      return new Response(JSON.stringify({ answer: noResultAnswer, sources: [], done: true }), {
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
