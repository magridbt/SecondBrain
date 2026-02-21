import { createClient } from '@/lib/supabase/server'
import { checkUsageLimit, trackTokenUsageWithRetry } from '@/lib/token-tracking'

const DEFAULT_PROMPT = `Você é um assistente espiritual que cria ensinamentos diários inspiradores baseados nos ensinamentos de Sri Amma Bhagavan.

INSTRUÇÕES:
1. Analise os ensinamentos fornecidos abaixo
2. Crie uma mensagem diária inspiradora, profunda e transformadora
3. A mensagem deve ser concisa (2-4 parágrafos) mas impactante
4. Use um tom caloroso e amoroso que inspire reflexão
5. Mantenha-se fiel aos ensinamentos originais - não invente conceitos
6. A mensagem pode incluir uma prática ou reflexão para o dia
7. Responda sempre em Português Brasileiro

FORMATO DE RESPOSTA:
- Título inspirador e curto (1 linha)
- Mensagem principal (2-4 parágrafos)
- Opcional: Uma prática ou reflexão para o dia

NÃO INCLUA:
- Citações diretas com aspas (incorpore naturalmente)
- Referências a documentos ou fontes
- Linguagem excessivamente formal ou acadêmica`

async function callProviderStream(
  provider: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  onText: (text: string) => void,
): Promise<{ fullText: string; inputTokens: number; outputTokens: number; model: string }> {
  if (provider === 'claude') {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')
    const model = 'claude-sonnet-4-20250514'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      throw new Error(`Anthropic error ${response.status}: ${errBody}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader from Anthropic response')

    const decoder = new TextDecoder()
    const textChunks: string[] = []
    let buffer = ''
    let inputTokens = 0
    let outputTokens = 0

    while (true) {
      const { done, value } = await reader.read()
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
            textChunks.push(data.delta.text)
            onText(data.delta.text)
          } else if (data.type === 'message_delta' && data.usage) {
            outputTokens = data.usage.output_tokens || 0
          } else if (data.type === 'message_start' && data.message?.usage) {
            inputTokens = data.message.usage.input_tokens || 0
          }
        } catch {}
      }
    }

    return { fullText: textChunks.join(''), inputTokens, outputTokens, model }
  }

  if (provider === 'chatgpt') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OpenAI API key not configured')
    const model = 'gpt-4o'

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`)

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader')

    const decoder = new TextDecoder()
    const textChunks: string[] = []
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
        try {
          const data = JSON.parse(line.slice(6))
          const text = data.choices?.[0]?.delta?.content
          if (text) {
            textChunks.push(text)
            onText(text)
          }
        } catch {}
      }
    }

    return { fullText: textChunks.join(''), inputTokens: 0, outputTokens: 0, model }
  }

  if (provider === 'gemini') {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) throw new Error('Google AI API key not configured')
    const model = 'gemini-1.5-pro'

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      }
    )

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`)

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader')

    const decoder = new TextDecoder()
    const textChunks: string[] = []
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            textChunks.push(text)
            onText(text)
          }
        } catch {}
      }
    }

    return { fullText: textChunks.join(''), inputTokens: 0, outputTokens: 0, model }
  }

  throw new Error(`Unknown provider: ${provider}`)
}

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const usageCheck = await checkUsageLimit(user.id, profile?.role || 'member')
    if (!usageCheck.allowed) {
      return new Response(JSON.stringify({ error: usageCheck.reason || 'Limite de uso atingido' }), { status: 429 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'JSON invalido' }), { status: 400 })
    }

    const { topic, selectedChunks, promptId, customPrompt, aiProvider, category = 'daily-teaching' } = body as {
      topic?: string; selectedChunks?: Array<{ id: string; content: string; documentName: string; sourceName: string }>
      promptId?: string; customPrompt?: string; aiProvider?: string; category?: string
    }

    if (!topic || typeof topic !== 'string') {
      return new Response(JSON.stringify({ error: 'Dados invalidos' }), { status: 400 })
    }

    let systemPrompt: string
    let userMessage: string

    if (selectedChunks?.length) {
      // RAG mode: include teaching chunks as context
      systemPrompt = customPrompt || DEFAULT_PROMPT
      let context = ''
      selectedChunks.forEach((chunk: any, index: number) => {
        context += `\n--- Ensinamento ${index + 1} ---\n${chunk.content}\n`
      })
      userMessage = `Tema solicitado: ${topic}\n\nResponda em Português Brasileiro.\n\nEnsinamentos selecionados:\n${context}\n\nCrie uma mensagem inspiradora baseada nesses ensinamentos seguindo as instruções fornecidas.`
    } else {
      // Direct mode: use the custom prompt as-is (used by Cursos)
      // customPrompt is REQUIRED in direct mode - it contains the agent's instructions
      systemPrompt = customPrompt || 'Você é um assistente especializado. Siga as instruções do usuário com precisão. Responda em Português Brasileiro.'
      userMessage = topic
    }

    const provider = (aiProvider || 'claude') as 'claude' | 'chatgpt' | 'gemini' | 'voyage'
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const result = await callProviderStream(
            provider,
            systemPrompt,
            userMessage,
            1500,
            (text) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`))
            },
          )

          // Track token usage with retry
          trackTokenUsageWithRetry({
            userId: user.id,
            model: result.model,
            provider,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            endpoint: 'daily-message-generate-stream',
          })

          // Save to database
          const { data: savedMessage, error: saveError } = await supabase
            .from('daily_messages')
            .insert({
              user_id: user.id,
              topic,
              selected_chunks: selectedChunks?.map((c: { id: string; content: string; documentName: string; sourceName: string }) => ({
                id: c.id,
                content: c.content.substring(0, 500),
                documentName: c.documentName,
                sourceName: c.sourceName,
              })) || [],
              generated_message: result.fullText,
              language: 'pt',
              status: 'draft',
              ai_provider: provider,
              ai_model: result.model,
              prompt_id: promptId || null,
              category,
            })
            .select()
            .single()

          if (saveError) {
            console.error('Save error:', saveError)
          }

          // Update prompt usage
          if (promptId) {
            try {
              await supabase.rpc('increment_prompt_usage', { prompt_id: promptId })
            } catch {}
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            id: savedMessage?.id,
            created_at: savedMessage?.created_at,
            ai_provider: provider,
            ai_model: result.model,
          })}\n\n`))
        } catch (err: any) {
          console.error('Stream generation error:', err?.message || err, err?.status, err?.stack)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: `Erro ao gerar mensagem: ${err?.message || 'unknown'}`,
          })}\n\n`))
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
  } catch (error: any) {
    console.error('Generate stream error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 })
  }
}
