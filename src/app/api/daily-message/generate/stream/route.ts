import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkUsageLimit, trackTokenUsage } from '@/lib/token-tracking'

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
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const model = 'claude-sonnet-4-20250514'
    const stream = await anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    let fullText = ''
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text
        onText(event.delta.text)
      }
    }

    const final = await stream.finalMessage()
    return {
      fullText,
      inputTokens: final.usage.input_tokens,
      outputTokens: final.usage.output_tokens,
      model,
    }
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
    let fullText = ''
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
            fullText += text
            onText(text)
          }
        } catch {}
      }
    }

    return { fullText, inputTokens: 0, outputTokens: 0, model }
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
    let fullText = ''
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
            fullText += text
            onText(text)
          }
        } catch {}
      }
    }

    return { fullText, inputTokens: 0, outputTokens: 0, model }
  }

  throw new Error(`Unknown provider: ${provider}`)
}

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

    const { topic, selectedChunks, promptId, customPrompt, aiProvider, category = 'daily-teaching' } = await request.json()

    if (!topic || !selectedChunks?.length) {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), { status: 400 })
    }

    const systemPrompt = customPrompt || DEFAULT_PROMPT
    let context = ''
    selectedChunks.forEach((chunk: any, index: number) => {
      context += `\n--- Ensinamento ${index + 1} ---\n${chunk.content}\n`
    })

    const userMessage = `Tema solicitado: ${topic}\n\nResponda em Português Brasileiro.\n\nEnsinamentos selecionados:\n${context}\n\nCrie uma mensagem inspiradora baseada nesses ensinamentos seguindo as instruções fornecidas.`

    const provider = aiProvider || 'claude'
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

          // Track token usage
          trackTokenUsage({
            userId: user.id,
            model: result.model,
            provider,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            endpoint: 'daily-message-generate-stream',
          }).catch(() => {})

          // Save to database
          const { data: savedMessage, error: saveError } = await supabase
            .from('daily_messages')
            .insert({
              user_id: user.id,
              topic,
              selected_chunks: selectedChunks.map((c: any) => ({
                id: c.id,
                content: c.content.substring(0, 500),
                documentName: c.documentName,
                sourceName: c.sourceName,
              })),
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
          console.error('Stream generation error:', err)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: err?.message || 'Erro ao gerar mensagem',
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
