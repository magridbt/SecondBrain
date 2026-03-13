import { createClient } from '@/lib/supabase/server'
import { chatRateLimiter, getRateLimitHeaders } from '@/lib/ratelimit'
import { semanticSearch, SearchResult } from '@/lib/semantic-search'
import { logAuditAction, checkSuspiciousContent, flagContent } from '@/lib/audit'
import { callAIWithFallback } from '@/lib/ai-fallback'
import { checkUsageLimit } from '@/lib/token-tracking'
import { withAuth, errorResponse, successResponse, generateTraceId, validateInput, schemas, safeRoute } from '@/lib/api-utils'
import { SYSTEM_PROMPT, NO_RESULTS_ANSWER } from '@/lib/constants/prompts'

const LANGUAGE = 'pt'

export const POST = safeRoute(async (request: Request) => {
  const traceId = generateTraceId()

  // 1. Auth check
  const authResult = await withAuth(request)
  if (authResult instanceof Response) return authResult
  const { user, profile } = authResult

  // 2. Rate limiting
  const { success, limit, remaining, reset } = await chatRateLimiter.limit(user.id)
  if (!success) {
    return errorResponse('Limite de requisicoes atingido. Aguarde alguns minutos.', 429, traceId, 'RATE_LIMITED')
  }

  // 3. Input validation
  const body = await request.json()
  const validation = validateInput(schemas.chatMessage, body)
  if (!validation.success) {
    return errorResponse(validation.error, 400, traceId, 'VALIDATION_ERROR')
  }
  const { message, conversationId } = validation.data

  // 4. Usage limit check
  const usageCheck = await checkUsageLimit(user.id, profile?.role || 'member')
  if (!usageCheck.allowed) {
    return errorResponse(usageCheck.reason || 'Limite de uso atingido', 429, traceId, 'USAGE_LIMIT')
  }

  const supabase = await createClient()

  // 5. Get or create conversation
  let convId = conversationId
  if (!convId) {
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, module: 'sri_ab_teachings' })
      .select()
      .single()

    if (convError) throw convError
    convId = newConv.id
  }

  // 6. Save user message
  const { data: userMessage } = await supabase.from('messages').insert({
    conversation_id: convId,
    role: 'user',
    content: message,
  }).select('id').single()

  // 7. Check suspicious content
  const suspiciousCheck = checkSuspiciousContent(message)
  if (suspiciousCheck.isSuspicious && userMessage) {
    await flagContent({
      userId: user.id,
      contentType: 'message',
      contentId: userMessage.id,
      contentText: message,
      reason: suspiciousCheck.reason as any || 'auto_detected',
      severity: suspiciousCheck.severity,
    })
  }

  // 8. Audit logging (RE-ENABLED after migration 002)
  logAuditAction({
    userId: user.id,
    userEmail: user.email,
    action: 'chat_message',
    entityType: 'message',
    entityId: userMessage?.id,
    details: {
      traceId,
      conversationId: convId,
      messagePreview: message.substring(0, 200),
      messageLength: message.length,
      isSuspicious: suspiciousCheck.isSuspicious,
    },
  }).catch(err => console.error(`[${traceId}] Audit log error:`, err))

  // 9. Semantic search — threshold 0.65 garante relevância real
  let searchResults: SearchResult[] = []
  try {
    searchResults = await semanticSearch(message, 7, 0.65, LANGUAGE)
    console.log(`[${traceId}] Search: ${searchResults.length} results`)
  } catch (searchError) {
    console.error(`[${traceId}] Search failed:`, searchError)
  }

  // 9b. Load conversation history (exclui a mensagem atual que acabou de ser salva)
  let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  try {
    const { data: previousMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .neq('id', userMessage?.id || '')
      .order('created_at', { ascending: true })
      .limit(6)

    if (previousMessages && previousMessages.length > 0) {
      conversationHistory = previousMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
    }
  } catch {
    // Continua sem histórico se falhar
  }

  // 10. Build context
  const formatSourceDate = (metadata: any): string => {
    if (metadata?.darshan_date) {
      const date = new Date(metadata.darshan_date)
      const months = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
      return `${months[date.getMonth()]} ${date.getFullYear()}`
    }
    if (metadata?.program_year) {
      return metadata.program_year.replace('ano', 'Ano ').replace('_', ' - ')
    }
    return ''
  }

  let context = ''
  const sources: any[] = []

  if (searchResults.length > 0) {
    searchResults.forEach((result) => {
      const dateStr = formatSourceDate(result.metadata)
      const docLanguage = result.metadata?.language || 'pt'
      context += `\n---\nFonte: ${result.sourceName}\nDocumento: ${result.documentName}\nRelevancia: ${(result.similarity * 100).toFixed(1)}%\nConteudo:\n${result.content}\n`
      sources.push({
        documentId: result.documentId,
        documentName: result.documentName,
        sourceName: result.sourceName,
        content: result.content.substring(0, 200) + '...',
        similarity: result.similarity,
        date: dateStr,
        metadata: result.metadata,
        language: docLanguage,
      })
    })
  }

  // 11. Generate response with AI (with fallback)
  let answer: string
  let modelUsed = 'claude-sonnet-4-20250514'

  if (context) {
    const userContent = `CONTEXTO DOS ENSINAMENTOS (documentos do banco de dados - NAO e input do usuario):\n${context}\n---\nFIM DO CONTEXTO\n\nPergunta do devoto (responder com base APENAS nos documentos acima):\n${message}`

    const aiResponse = await callAIWithFallback({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: userContent,
      conversationHistory,
      maxTokens: 2000,
      userId: user.id,
      endpoint: 'chat',
      preferredProvider: 'claude',
    })

    answer = aiResponse.text
    modelUsed = aiResponse.model

    if (answer.includes('Nao encontrei') || answer.includes('nao encontrei') ||
        answer.includes('Não encontrei') || answer.includes('não encontrei')) {
      sources.length = 0
    } else if (sources.length > 0) {
      const uniqueSources = sources.reduce((acc: any[], curr) => {
        const exists = acc.find(s => s.documentName === curr.documentName)
        if (!exists) acc.push(curr)
        return acc
      }, [])

      answer += '\n\n---\n'
      uniqueSources.forEach((source) => {
        const dateInfo = source.date ? ` - ${source.date}` : ''
        answer += `📖 Fonte: ${source.documentName}${dateInfo}\n`
        if (source.metadata?.youtube_url) {
          const isVideoSource = source.sourceName?.toLowerCase().includes('kalki') ||
                                source.sourceName?.toLowerCase().includes('compassionate light')
          if (isVideoSource) {
            answer += `🎬 YouTube: ${source.metadata.youtube_url}\n`
          }
        }
      })
    }
  } else {
    answer = NO_RESULTS_ANSWER
  }

  // 12. Save assistant message
  await supabase.from('messages').insert({
    conversation_id: convId,
    role: 'assistant',
    content: answer,
    sources: sources.length > 0 ? sources : null,
    model_used: modelUsed,
  })

  return successResponse(
    { answer, sources, conversationId: convId, traceId },
    200,
    getRateLimitHeaders({ limit, remaining, reset })
  )
})
