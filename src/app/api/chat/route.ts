import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { chatRateLimiter, getRateLimitHeaders } from '@/lib/ratelimit'
import { semanticSearch, SearchResult } from '@/lib/semantic-search'
import { logAuditAction, checkSuspiciousContent, flagContent } from '@/lib/audit'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Portuguese only - no language detection needed for now
const LANGUAGE = 'pt'

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

    // Search for relevant chunks using semantic search (embeddings)
    // Search ONLY in Portuguese documents with high relevance threshold (60%)
    let searchResults: SearchResult[] = []
    try {
      searchResults = await semanticSearch(message, 5, 0.6, LANGUAGE)
      console.log(`Semantic search found ${searchResults.length} results (Portuguese only, 60% similarity threshold)`)
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
        : 'Desculpe, não consegui gerar uma resposta.'

      // If Claude says "not found", clear all sources - show NOTHING else, only the message
      if (answer.includes('Não encontrei') || answer.includes('não encontrei')) {
        sources.length = 0 // Clear sources array
      } else {
        // Only append sources if Claude found relevant information
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
            answer += `📖 Fonte: ${source.documentName}${dateInfo}\n`

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
      }
    } else {
      // No documents found in Portuguese - DO NOT invent any teaching
      answer = `Não encontrei ensinamentos específicos de Sri Amma Bhagavan sobre este tema nos documentos disponíveis.

Por favor, tente reformular sua pergunta ou consulte os ensinamentos disponíveis diretamente.

🙏 Namaste`
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
