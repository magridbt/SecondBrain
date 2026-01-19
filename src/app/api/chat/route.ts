import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { chatRateLimiter, getRateLimitHeaders } from '@/lib/ratelimit'
import { semanticSearch, SearchResult } from '@/lib/semantic-search'
import { logAuditAction, checkSuspiciousContent, flagContent } from '@/lib/audit'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Detect language from text
function detectLanguage(text: string): 'pt' | 'en' | 'es' {
  const lowerText = text.toLowerCase()

  // Portuguese indicators
  const ptPatterns = /[áàâãéèêíìîóòôõúùûç]|(\b(que|como|por|para|uma?|não|sim|está|você|obrigad[oa]|sobre|quando|onde|porque|qual|quais|tudo|nada|muito|pouco|sempre|nunca|também|ainda|agora|depois|antes|entre|durante|através|segundo|conforme|embora|porém|contudo|entretanto|portanto|assim|então|logo|pois|ora|mas|nem|seja|quer|embora|enquanto|caso|senão|salvo|exceto|apesar)\b)/i
  const ptMatches = (lowerText.match(ptPatterns) || []).length

  // Spanish indicators
  const esPatterns = /[áéíóúñ¿¡]|(\b(qué|cómo|cuál|cuáles|dónde|cuándo|quién|quiénes|por qué|porque|para|está|usted|ustedes|también|todavía|siempre|nunca|mucho|poco|ahora|después|antes|entre|durante|según|aunque|pero|sino|sin embargo|no obstante|por lo tanto|así que|entonces|pues|ya que|mientras|cuando|donde|como)\b)/i
  const esMatches = (lowerText.match(esPatterns) || []).length

  // English indicators
  const enPatterns = /\b(the|and|is|are|was|were|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|shall|can|what|where|when|why|how|which|who|whom|whose|this|that|these|those|there|here|about|through|during|before|after|above|below|between|into|because|although|however|therefore|moreover|furthermore|nevertheless|meanwhile|otherwise|instead|rather|whether)\b/i
  const enMatches = (lowerText.match(enPatterns) || []).length

  // Calculate scores (normalize by text length)
  const textLength = text.split(' ').length
  const ptScore = ptMatches / textLength
  const esScore = esMatches / textLength
  const enScore = enMatches / textLength

  // Determine language
  if (ptScore > esScore && ptScore > enScore) return 'pt'
  if (esScore > ptScore && esScore > enScore) return 'es'
  return 'en' // Default to English
}

const SYSTEM_PROMPT = `You are a faithful assistant that transmits ONLY the authentic teachings of Sri Amma Bhagavan.

ABSOLUTE AND NON-NEGOTIABLE RULES:

1. FIDELITY TO SOURCE: You may ONLY use information that is EXPLICITLY present in the provided context.
   - NEVER invent, deduce, extrapolate, or add teachings that are not in the context
   - NEVER mix teachings from other spiritual traditions or masters
   - NEVER paraphrase in a way that changes the original meaning

2. WHEN YOU DON'T FIND INFORMATION:
   - If the context doesn't contain relevant information, respond EXACTLY:
     "I didn't find a specific teaching from Sri Amma Bhagavan about this topic in the available documents. Please try rephrasing your question or consult the available teachings directly."
   - NEVER try to "help" by inventing or guessing what the teaching might be

3. HONESTY AND HUMILITY:
   - If the context is partial or unclear, say: "The available context mentions this topic but doesn't provide a complete answer."
   - NEVER use phrases like "I believe", "probably", "maybe Sri Bhagavan would say"
   - NEVER add personal interpretations or conclusions

4. TONE AND LANGUAGE:
   - Use a serene, compassionate, and respectful tone
   - Answer in the SAME language as the question (Portuguese, English, or Spanish)
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting check
    const { success, limit, remaining, reset } = await chatRateLimiter.limit(user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait a few minutes.' },
        {
          status: 429,
          headers: getRateLimitHeaders({ limit, remaining, reset })
        }
      )
    }

    const { message, conversationId } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    // Get or create conversation
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

    // Save user message
    const { data: userMessage } = await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: message,
    }).select('id').single()

    // Check for suspicious content and flag if needed
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

    // Log user message to audit
    logAuditAction({
      userId: user.id,
      userEmail: user.email,
      action: 'chat_message',
      entityType: 'message',
      entityId: userMessage?.id,
      details: {
        conversationId: convId,
        messagePreview: message.substring(0, 200),
        messageLength: message.length,
        isSuspicious: suspiciousCheck.isSuspicious,
      },
    }).catch(err => console.error('Audit log error:', err))

    // Detect language from the user's message
    const detectedLanguage = detectLanguage(message)
    console.log(`Detected language: ${detectedLanguage}`)

    // Language names for display
    const languageNames: Record<string, Record<string, string>> = {
      pt: { pt: 'Português', en: 'Inglês', es: 'Espanhol' },
      en: { pt: 'Portuguese', en: 'English', es: 'Spanish' },
      es: { pt: 'Portugués', en: 'Inglés', es: 'Español' },
    }

    // Search for relevant chunks using semantic search (embeddings)
    // Filter by the detected language for more precise results
    let searchResults: SearchResult[] = []
    let resultsFromOtherLanguage = false
    try {
      searchResults = await semanticSearch(message, 5, 0.3, detectedLanguage)
      console.log(`Semantic search found ${searchResults.length} results (language: ${detectedLanguage})`)

      // If no results in detected language, try searching all languages as fallback
      if (searchResults.length === 0) {
        console.log('No results in detected language, searching all languages...')
        searchResults = await semanticSearch(message, 5, 0.3, null)
        console.log(`Fallback search found ${searchResults.length} results (all languages)`)
        if (searchResults.length > 0) {
          resultsFromOtherLanguage = true
        }
      }
    } catch (searchError) {
      console.error('Semantic search failed:', searchError)
      // Continue with empty results - will trigger the "no documents" response
    }

    // Helper function to format date for display
    const formatSourceDate = (metadata: any): string => {
      if (metadata?.darshan_date) {
        const date = new Date(metadata.darshan_date)
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
        return `${months[date.getMonth()]} ${date.getFullYear()}`
      }
      if (metadata?.program_year) {
        return metadata.program_year.replace('ano', 'Year ').replace('_', ' - ')
      }
      return ''
    }

    // Build context from search results
    let context = ''
    const sources: any[] = []

    if (searchResults.length > 0) {
      searchResults.forEach((result) => {
        const dateStr = formatSourceDate(result.metadata)
        const docLanguage = result.metadata?.language || 'en'
        context += `\n---\nSource: ${result.sourceName}\nDocument: ${result.documentName}\nLanguage: ${docLanguage}\nRelevance: ${(result.similarity * 100).toFixed(1)}%\nContent:\n${result.content}\n`
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

    // Generate response with Claude
    let answer: string

    if (context) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Teachings context:\n${context}\n\nDevotee's question: ${message}`,
          },
        ],
      })

      answer = response.content[0].type === 'text'
        ? response.content[0].text
        : 'Sorry, I could not generate a response.'

      // Add notice if results are from other languages
      if (resultsFromOtherLanguage) {
        const langNames = languageNames[detectedLanguage] || languageNames.en
        const otherLangNotice: Record<string, string> = {
          pt: `\n\n⚠️ **Nota:** Não encontrei ensinamentos em Português sobre este tema. Os resultados abaixo estão em outros idiomas.`,
          en: `\n\n⚠️ **Note:** I didn't find teachings in English about this topic. The results below are in other languages.`,
          es: `\n\n⚠️ **Nota:** No encontré enseñanzas en Español sobre este tema. Los resultados a continuación están en otros idiomas.`,
        }
        answer += otherLangNotice[detectedLanguage] || otherLangNotice.en
      }

      // Append sources at the end of the answer
      if (sources.length > 0) {
        // Get unique sources (avoid duplicates)
        const uniqueSources = sources.reduce((acc: any[], curr) => {
          const exists = acc.find(s => s.documentName === curr.documentName)
          if (!exists) acc.push(curr)
          return acc
        }, [])

        answer += '\n\n---\n'
        uniqueSources.forEach((source, index) => {
          const dateInfo = source.date ? ` - ${source.date}` : ''
          const langNames = languageNames[detectedLanguage] || languageNames.en
          const sourceLang = source.language || 'en'
          const langIndicator = resultsFromOtherLanguage && sourceLang !== detectedLanguage
            ? ` [${langNames[sourceLang] || sourceLang.toUpperCase()}]`
            : ''
          answer += `📖 Source: ${source.documentName}${dateInfo}${langIndicator}\n`

          // Add YouTube URL for video sources (Kalki Dharma Videos and Great Compassionate Light)
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
      // No documents found - DO NOT invent any teaching
      // Detect language from message to respond appropriately
      const isPortuguese = /[áàâãéèêíìîóòôõúùûç]|(\b(que|como|por|para|uma?|não|sim|está|você)\b)/i.test(message)
      const isSpanish = /[áéíóúñ¿¡]|(\b(qué|cómo|por|para|una?|está|usted)\b)/i.test(message) && !isPortuguese

      if (isPortuguese) {
        answer = `Não encontrei ensinamentos específicos de Sri Amma Bhagavan sobre este tema nos documentos disponíveis.

Por favor, tente reformular sua pergunta ou aguarde enquanto mais ensinamentos são adicionados ao sistema.

🙏 Namaste`
      } else if (isSpanish) {
        answer = `No encontré enseñanzas específicas de Sri Amma Bhagavan sobre este tema en los documentos disponibles.

Por favor, intente reformular su pregunta o espere mientras se agregan más enseñanzas al sistema.

🙏 Namaste`
      } else {
        answer = `I didn't find specific teachings from Sri Amma Bhagavan about this topic in the available documents.

Please try rephrasing your question or wait while more teachings are being added to the system.

🙏 Namaste`
      }
    }

    // Save assistant message
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: answer,
      sources: sources.length > 0 ? sources : null,
      model_used: 'claude-sonnet-4-20250514',
    })

    return NextResponse.json(
      {
        answer,
        sources,
        conversationId: convId,
      },
      {
        headers: getRateLimitHeaders({ limit, remaining, reset })
      }
    )
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
