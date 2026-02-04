import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAllThemes } from '@/lib/theme-classifier'
import { generalRateLimiter, getRateLimitHeaders } from '@/lib/ratelimit'
import { cachedThemes } from '@/lib/cache'
import { secureLog } from '@/lib/logger'

// Theme type for caching (matches getAllThemes return type)
interface Theme {
  id: string
  slug: string
  name_pt: string
  name_en: string
  name_es: string | null
  icon: string
  color: string
}

// GET - List all active themes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const { success, limit, remaining, reset } = await generalRateLimiter.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders({ limit, remaining, reset }) }
      )
    }

    // Use cached themes (10 minute cache)
    const themes = await cachedThemes<Theme>(async () => {
      return await getAllThemes()
    })

    return NextResponse.json(
      { themes },
      { headers: getRateLimitHeaders({ limit, remaining, reset }) }
    )
  } catch (error) {
    secureLog('error', 'Themes error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
