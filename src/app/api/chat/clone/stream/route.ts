import { createClient } from '@/lib/supabase/server'
import { semanticSearch, SearchResult } from '@/lib/semantic-search'
import { chatRateLimiter } from '@/lib/ratelimit'
import { checkUsageLimit, trackTokenUsageWithRetry } from '@/lib/token-tracking'
import { CLONE_SYSTEM_PROMPT } from '@/lib/constants/prompts'

const LANGUAGE = 'pt'
const MAX_MESSAGE_LENGTH = 5000

export const maxDuration = 60

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

    // Semantic search (RAG como enriquecimento do DNA Mental) — threshold 0.65 = apenas contexto relevante
    let searchResults: SearchResult[] = []
    try {
      searchResults = await semanticSearch(message, 7, 0.65, LANGUAGE)
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

    // Load conversation history (últimas 6 mensagens = 3 pares para memória conversacional)
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    if (conversationId) {
      const { data: previousMessages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(6)

      if (previousMessages && previousMessages.length > 0) {
        conversationHistory = previousMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      }
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

    // Stream with Claude via fetch (serverless-compatible)
    const claudeModel = 'claude-sonnet-4-20250514'
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: claudeModel,
        max_tokens: 2000,
        stream: true,
        system: CLONE_SYSTEM_PROMPT,
        messages: [
          ...conversationHistory,
          { role: 'user', content: userContent },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      await claudeResponse.text().catch(() => '')
      console.error('Anthropic API error: status', claudeResponse.status)
      return new Response(JSON.stringify({ error: 'Erro na API de IA' }), { status: 502 })
    }

    const claudeReader = claudeResponse.body?.getReader()
    if (!claudeReader) {
      return new Response(JSON.stringify({ error: 'Erro ao conectar com IA' }), { status: 502 })
    }

    // Create SSE response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const textChunks: string[] = []
        let inputTokens = 0
        let outputTokens = 0
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await claudeReader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const jsonStr = line.slice(6).trim()
              if (!jsonStr) continue
              try {
                const data = JSON.parse(jsonStr)
                if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                  const text = data.delta.text
                  textChunks.push(text)
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`))
                } else if (data.type === 'message_delta' && data.usage) {
                  outputTokens = data.usage.output_tokens || 0
                } else if (data.type === 'message_start' && data.message?.usage) {
                  inputTokens = data.message.usage.input_tokens || 0
                }
              } catch {}
            }
          }

          const fullText = textChunks.join('')

          // Track token usage with retry
          trackTokenUsageWithRetry({
            userId: user.id,
            model: claudeModel,
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
                model_used: claudeModel,
              },
            ])
          }

          // Send done event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', conversationId: convId })}\n\n`))
        } catch (err: any) {
          console.error('Clone stream error:', err?.message || err)
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
