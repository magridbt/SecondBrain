import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'

function hashQuery(query: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ')
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

export async function getCachedEmbedding(query: string): Promise<number[] | null> {
  const adminClient = createAdminClient()
  const queryHash = hashQuery(query)

  try {
    const { data, error } = await adminClient
      .from('embedding_cache')
      .select('embedding')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) return null

    // Increment hit count (fire and forget)
    ;(async () => {
      try {
        await adminClient.rpc('increment_hit_count', { row_hash: queryHash })
      } catch {
        // Non-critical, ignore
      }
    })()

    return data.embedding as unknown as number[]
  } catch {
    return null
  }
}

export async function setCachedEmbedding(query: string, embedding: number[], ttlDays: number = 7): Promise<void> {
  const adminClient = createAdminClient()
  const queryHash = hashQuery(query)
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()

  try {
    await adminClient
      .from('embedding_cache')
      .upsert({
        query_hash: queryHash,
        query_text: query.substring(0, 500),
        embedding: embedding as any,
        expires_at: expiresAt,
        hit_count: 1,
      }, { onConflict: 'query_hash' })
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

export async function cleanExpiredCache(): Promise<number> {
  const adminClient = createAdminClient()

  try {
    const { data, error } = await adminClient
      .from('embedding_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id')

    return data?.length || 0
  } catch {
    return 0
  }
}
