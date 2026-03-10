import { createClient } from '@/lib/supabase/server'
import { checkUsageLimit, trackTokenUsageWithRetry } from '@/lib/token-tracking'

const FORMAT_RULES = `

REGRAS DE FORMATACAO (OBRIGATORIO):
- NUNCA use markdown (nada de **, *, #, _, ~, \`).
- Para dar enfase, use LETRAS MAIUSCULAS ou emojis relevantes.
- Escreva texto puro, pronto para copiar e colar direto na rede social.
- Use emojis com sabedoria para destacar pontos importantes e criar apelo visual.`

const DEFAULT_PROMPTS: Record<string, string> = {
  youtube: `Voce e um especialista em conteudo para YouTube sobre espiritualidade e milagres.
Transforme o relato de milagre abaixo em um roteiro envolvente para YouTube.

FORMATO:
- TITULO: Titulo chamativo e otimizado para CTR (max 60 caracteres)
- THUMBNAIL: Sugestao de texto para thumbnail (max 5 palavras)
- GANCHO (primeiros 30 segundos): Frase de abertura que prenda a atencao
- ROTEIRO: Narrativa completa (3-5 minutos de fala)
- CTA: Chamada para acao no final
- DESCRICAO: Descricao do video com keywords (max 200 palavras)
- TAGS: 10 tags relevantes separadas por virgula
${FORMAT_RULES}
Responda em Portugues Brasileiro. Mantenha o tom espiritual e inspirador.`,

  instagram: `Voce e um especialista em conteudo para Instagram sobre espiritualidade e milagres.
Transforme o relato de milagre abaixo em conteudo para Instagram.

FORMATO:
- LEGENDA: Texto envolvente com storytelling (max 2200 caracteres). Use paragrafos curtos e emojis com moderacao.
- CARROSSEL: Se aplicavel, sugira 5-7 slides para carrossel (titulo de cada slide)
- REELS: Roteiro curto para Reels (15-30 segundos)
- STORIES: 3-4 sequencias de stories
- HASHTAGS: 20 hashtags relevantes
${FORMAT_RULES}
Responda em Portugues Brasileiro. Tom inspirador e acessivel.`,

  'x-twitter': `Voce e um especialista em conteudo para X (Twitter) sobre espiritualidade e milagres.
Transforme o relato de milagre abaixo em posts para X.

FORMATO:
- TWEET PRINCIPAL: Post impactante (max 280 caracteres)
- THREAD: 5-7 tweets que contam a historia completa
- TWEET DE ENGAJAMENTO: Pergunta para gerar interacao
${FORMAT_RULES}
Responda em Portugues Brasileiro. Tom direto e inspirador.`,

  facebook: `Voce e um especialista em conteudo para Facebook sobre espiritualidade e milagres.
Transforme o relato de milagre abaixo em post para Facebook.

FORMATO:
- POST: Texto completo com storytelling (sem limite de caracteres, mas envolvente)
- Use paragrafos curtos e emojis com moderacao
- Inclua uma pergunta no final para gerar engajamento
- GRUPO: Versao adaptada para grupos de espiritualidade
${FORMAT_RULES}
Responda em Portugues Brasileiro. Tom caloroso e comunitario.`,

  linkedin: `Voce e um especialista em conteudo para LinkedIn sobre espiritualidade e transformacao pessoal.
Transforme o relato de milagre abaixo em post profissional para LinkedIn.

FORMATO:
- POST: Texto com storytelling profissional. Conecte a experiencia espiritual com aprendizados de vida.
- Use paragrafos curtos e espacamento
- Inclua insight ou reflexao no final
- HASHTAGS: 5 hashtags profissionais
${FORMAT_RULES}
Responda em Portugues Brasileiro. Tom profissional e inspirador.`,

  tiktok: `Voce e um especialista em conteudo para TikTok sobre espiritualidade e milagres.
Transforme o relato de milagre abaixo em roteiro para TikTok.

FORMATO:
- GANCHO: Frase de abertura impactante (primeiros 3 segundos)
- ROTEIRO: Script completo para video curto (30-60 segundos)
- TEXTO NA TELA: Textos que aparecem durante o video
- SOM: Sugestao de tipo de audio/musica de fundo
- HASHTAGS: 10 hashtags trending + nicho
${FORMAT_RULES}
Responda em Portugues Brasileiro. Tom dinamico e envolvente.`,

  threads: `Voce e um especialista em conteudo para Threads sobre espiritualidade e milagres.
Transforme o relato de milagre abaixo em post para Threads.

FORMATO:
- POST: Texto conversacional e envolvente (max 500 caracteres)
- SEQUENCIA: 3-4 posts conectados contando a historia
- Mantenha o tom informal e autentico
${FORMAT_RULES}
Responda em Portugues Brasileiro. Tom conversacional.`,

  pinterest: `Voce e um especialista em conteudo para Pinterest sobre espiritualidade e milagres.
Transforme o relato de milagre abaixo em conteudo para Pinterest.

FORMATO:
- PIN TITULO: Titulo otimizado para busca (max 100 caracteres)
- PIN DESCRICAO: Descricao com keywords (max 500 caracteres)
- BOARD: Sugestao de nome de board
- IDEA PIN: 5 slides com texto inspirador extraido do milagre
- KEYWORDS: 10 palavras-chave para SEO
${FORMAT_RULES}
Responda em Portugues Brasileiro. Tom inspirador e visual.`,
}

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

    try {
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
    } catch (err) {
      if (reader) reader.cancel().catch(() => {})
      throw err
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

    try {
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
    } catch (err) {
      if (reader) reader.cancel().catch(() => {})
      throw err
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

    try {
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
    } catch (err) {
      if (reader) reader.cancel().catch(() => {})
      throw err
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

    const { miracle_id, miracle_content, target_network, prompt_id, custom_prompt, ai_provider } = body as {
      miracle_id: string
      miracle_content: string
      target_network: string
      prompt_id?: string
      custom_prompt?: string
      ai_provider?: string
    }

    if (!miracle_content || !target_network) {
      return new Response(JSON.stringify({ error: 'Milagre e rede social destino sao obrigatorios' }), { status: 400 })
    }

    // Determine system prompt: custom > prompt_id > default for network
    let systemPrompt: string
    if (custom_prompt) {
      systemPrompt = custom_prompt
    } else if (prompt_id) {
      const { data: promptData } = await supabase
        .from('miracle_prompts')
        .select('system_prompt')
        .eq('id', prompt_id)
        .single()
      systemPrompt = promptData?.system_prompt || DEFAULT_PROMPTS[target_network] || DEFAULT_PROMPTS.instagram
    } else {
      systemPrompt = DEFAULT_PROMPTS[target_network] || DEFAULT_PROMPTS.instagram
    }

    const userMessage = `RELATO DE MILAGRE:\n\n${miracle_content}\n\nTransforme este relato de milagre em conteudo otimizado para a rede social conforme as instrucoes.`
    const provider = (ai_provider || 'claude') as string
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const result = await callProviderStream(
            provider,
            systemPrompt,
            userMessage,
            2000,
            (text) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`))
            },
          )

          trackTokenUsageWithRetry({
            userId: user.id,
            model: result.model,
            provider: provider as 'claude' | 'chatgpt' | 'gemini' | 'voyage',
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            endpoint: 'miracles-generate-stream',
          })

          // Save generated copy
          const { data: savedCopy, error: saveError } = await supabase
            .from('miracle_copies')
            .insert({
              user_id: user.id,
              miracle_id: miracle_id || null,
              target_network,
              generated_copy: result.fullText,
              ai_provider: provider,
              ai_model: result.model,
              prompt_id: prompt_id || null,
            })
            .select()
            .single()

          if (saveError) {
            console.error('Save copy error:', saveError)
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            id: savedCopy?.id,
            ai_provider: provider,
            ai_model: result.model,
          })}\n\n`))
        } catch (err: any) {
          console.error('Stream generation error:', err?.message || err)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: `Erro ao gerar copy: ${err?.message || 'unknown'}`,
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
