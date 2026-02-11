import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Default AI Models configuration
const DEFAULT_MODELS = {
  claude: 'claude-sonnet-4-20250514',
  chatgpt: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
}

const AI_PROVIDER_NAMES = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
}

// User AI settings interface
interface UserAISettings {
  anthropic_api_key: string | null
  openai_api_key: string | null
  gemini_api_key: string | null
  claude_model: string
  openai_model: string
  gemini_model: string
  temperature: number
  max_tokens: number
}

// Selected chunk from the frontend
interface SelectedChunk {
  id: string
  content: string
  documentName?: string
  sourceName?: string
}

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

// Generate with Claude
async function generateWithClaude(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model: string,
  maxTokens: number
): Promise<string> {
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

// Generate with ChatGPT
async function generateWithChatGPT(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model: string,
  maxTokens: number
): Promise<string> {
  const client = new OpenAI({ apiKey })
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })

  return response.choices[0]?.message?.content || ''
}

// Generate with Gemini
async function generateWithGemini(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  })

  const result = await geminiModel.generateContent(userMessage)
  return result.response.text()
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      topic,
      selectedChunks,
      promptId,
      customPrompt,
      aiProvider = 'claude'
    } = await request.json()

    // Portuguese only - no language selection
    const language = 'pt'

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    if (!selectedChunks || !Array.isArray(selectedChunks) || selectedChunks.length === 0) {
      return NextResponse.json({ error: 'At least one teaching must be selected' }, { status: 400 })
    }

    // Validate AI provider
    if (!['claude', 'chatgpt', 'gemini'].includes(aiProvider)) {
      return NextResponse.json({ error: 'Invalid AI provider' }, { status: 400 })
    }

    // Fetch user's AI settings
    const { data: userSettings } = await supabase
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Determine which API key and model to use
    let apiKey: string | null = null
    let model: string = DEFAULT_MODELS[aiProvider as keyof typeof DEFAULT_MODELS]
    let maxTokens: number = userSettings?.max_tokens || 1500

    switch (aiProvider) {
      case 'claude':
        apiKey = userSettings?.anthropic_api_key || process.env.ANTHROPIC_API_KEY || null
        model = userSettings?.claude_model || DEFAULT_MODELS.claude
        break
      case 'chatgpt':
        apiKey = userSettings?.openai_api_key || process.env.OPENAI_API_KEY || null
        model = userSettings?.openai_model || DEFAULT_MODELS.chatgpt
        break
      case 'gemini':
        apiKey = userSettings?.gemini_api_key || process.env.GEMINI_API_KEY || null
        model = userSettings?.gemini_model || DEFAULT_MODELS.gemini
        break
    }

    if (!apiKey) {
      return NextResponse.json({
        error: `No API key configured for ${AI_PROVIDER_NAMES[aiProvider as keyof typeof AI_PROVIDER_NAMES]}. Please add your API key in Settings.`
      }, { status: 400 })
    }

    // Use custom prompt if provided, otherwise use default
    const systemPrompt = customPrompt || DEFAULT_PROMPT

    // Build context from selected chunks
    let context = ''
    ;(selectedChunks as SelectedChunk[]).forEach((chunk, index) => {
      context += `\n--- Teaching ${index + 1} ---\n${chunk.content}\n`
    })

    // Portuguese only instruction
    const userMessage = `Tema solicitado: ${topic}

Responda em Português Brasileiro.

Ensinamentos selecionados:
${context}

Crie uma mensagem inspiradora baseada nesses ensinamentos seguindo as instruções fornecidas.`

    // Generate message with selected AI provider
    let generatedMessage: string

    try {
      switch (aiProvider) {
        case 'chatgpt':
          generatedMessage = await generateWithChatGPT(systemPrompt, userMessage, apiKey, model, maxTokens)
          break
        case 'gemini':
          generatedMessage = await generateWithGemini(systemPrompt, userMessage, apiKey, model)
          break
        case 'claude':
        default:
          generatedMessage = await generateWithClaude(systemPrompt, userMessage, apiKey, model, maxTokens)
          break
      }
    } catch (aiError) {
      console.error(`${aiProvider} error:`, aiError)
      const errorMessage = aiError instanceof Error ? aiError.message : ''
      if (errorMessage.includes('401') || errorMessage.includes('Invalid API') || errorMessage.includes('invalid_api_key')) {
        return NextResponse.json({
          error: `Invalid API key for ${AI_PROVIDER_NAMES[aiProvider as keyof typeof AI_PROVIDER_NAMES]}. Please check your API key in Settings.`
        }, { status: 401 })
      }
      return NextResponse.json({
        error: `Failed to generate with ${AI_PROVIDER_NAMES[aiProvider as keyof typeof AI_PROVIDER_NAMES]}. Please try another AI provider.`
      }, { status: 500 })
    }

    if (!generatedMessage) {
      return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 })
    }

    // Save to database
    const { data: savedMessage, error: saveError } = await supabase
      .from('daily_messages')
      .insert({
        user_id: user.id,
        topic,
        selected_chunks: (selectedChunks as SelectedChunk[]).map(c => ({
          id: c.id,
          content: c.content.substring(0, 500),
          documentName: c.documentName,
          sourceName: c.sourceName,
        })),
        generated_message: generatedMessage,
        language,
        status: 'draft',
        ai_provider: aiProvider,
        ai_model: model,
        prompt_id: promptId || null,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Save error:', saveError)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // Update prompt usage count if a prompt was used
    // Uses SECURITY DEFINER function to allow updating public prompts
    if (promptId) {
      try {
        await supabase.rpc('increment_prompt_usage', { prompt_id: promptId })
      } catch (err) {
        console.error('Failed to update prompt usage:', err)
      }
    }

    return NextResponse.json({
      message: generatedMessage,
      id: savedMessage.id,
      created_at: savedMessage.created_at,
      ai_provider: aiProvider,
      ai_model: model,
    })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    )
  }
}
