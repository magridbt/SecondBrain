import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { provider, apiKey, model } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 })
    }

    // Test the API key by making a simple request to each provider
    switch (provider) {
      case 'claude': {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: model || 'claude-sonnet-4-20250514',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          return NextResponse.json(
            { error: error.error?.message || 'Invalid API key' },
            { status: 400 }
          )
        }

        return NextResponse.json({ success: true, message: 'Claude API key is valid!' })
      }

      case 'chatgpt': {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model || 'gpt-4o',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          return NextResponse.json(
            { error: error.error?.message || 'Invalid API key' },
            { status: 400 }
          )
        }

        return NextResponse.json({ success: true, message: 'OpenAI API key is valid!' })
      }

      case 'gemini': {
        const modelName = model || 'gemini-1.5-pro'
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hi' }] }],
              generationConfig: { maxOutputTokens: 10 },
            }),
          }
        )

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          return NextResponse.json(
            { error: error.error?.message || 'Invalid API key' },
            { status: 400 }
          )
        }

        return NextResponse.json({ success: true, message: 'Gemini API key is valid!' })
      }

      default:
        return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }
  } catch (error) {
    console.error('API test error:', error)
    const message = error instanceof Error ? error.message : 'Failed to test API key'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
