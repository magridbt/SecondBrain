import { createClient } from '@/lib/supabase/server'
import { callAIWithFallback } from '@/lib/ai-fallback'
import { checkUsageLimit } from '@/lib/token-tracking'
import { withAuth, errorResponse, successResponse, generateTraceId, validateInput, schemas, safeRoute } from '@/lib/api-utils'

const AI_PROVIDER_NAMES = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
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

export const POST = safeRoute(async (request: Request) => {
  const traceId = generateTraceId()

  // 1. Auth
  const authResult = await withAuth(request)
  if (authResult instanceof Response) return authResult
  const { user, profile } = authResult

  // 2. Validate input
  const body = await request.json()
  const validation = validateInput(schemas.dailyGenerate, body)
  if (!validation.success) {
    return errorResponse(validation.error, 400, traceId, 'VALIDATION_ERROR')
  }
  const { topic, selectedChunks, promptId, customPrompt, aiProvider, category } = validation.data

  // 3. Usage limit check
  const usageCheck = await checkUsageLimit(user.id, profile?.role || 'member')
  if (!usageCheck.allowed) {
    return errorResponse(usageCheck.reason || 'Limite de uso atingido', 429, traceId, 'USAGE_LIMIT')
  }

  // 4. Build context
  const systemPrompt = customPrompt || DEFAULT_PROMPT
  let context = ''
  selectedChunks.forEach((chunk, index) => {
    context += `\n--- Ensinamento ${index + 1} ---\n${chunk.content}\n`
  })

  const userMessage = `Tema solicitado: ${topic}

Responda em Português Brasileiro.

Ensinamentos selecionados:
${context}

Crie uma mensagem inspiradora baseada nesses ensinamentos seguindo as instruções fornecidas.`

  // 5. Generate with AI (with automatic fallback)
  const aiResponse = await callAIWithFallback({
    systemPrompt,
    userMessage,
    maxTokens: 1500,
    userId: user.id,
    endpoint: 'daily-message-generate',
    preferredProvider: aiProvider,
  })

  if (!aiResponse.text) {
    return errorResponse('Falha ao gerar mensagem', 500, traceId)
  }

  // 6. Save to database
  const supabase = await createClient()
  const { data: savedMessage, error: saveError } = await supabase
    .from('daily_messages')
    .insert({
      user_id: user.id,
      topic,
      selected_chunks: selectedChunks.map(c => ({
        id: c.id,
        content: c.content.substring(0, 500),
        documentName: c.documentName,
        sourceName: c.sourceName,
      })),
      generated_message: aiResponse.text,
      language: 'pt',
      status: 'draft',
      ai_provider: aiResponse.provider,
      ai_model: aiResponse.model,
      prompt_id: promptId || null,
      category: category || 'daily-teaching',
    })
    .select()
    .single()

  if (saveError) {
    console.error(`[${traceId}] Save error:`, saveError)
    return errorResponse('Falha ao salvar mensagem', 500, traceId)
  }

  // 7. Update prompt usage
  if (promptId) {
    try {
      await supabase.rpc('increment_prompt_usage', { prompt_id: promptId })
    } catch {
      // Non-blocking - don't fail the response if usage tracking fails
    }
  }

  return successResponse({
    message: aiResponse.text,
    id: savedMessage.id,
    created_at: savedMessage.created_at,
    ai_provider: aiResponse.provider,
    ai_model: aiResponse.model,
    traceId,
  })
})
