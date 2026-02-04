/**
 * Redis Cache Strategy
 * SecondBrain-SriAmmaBhagavan
 *
 * Implementação de cache com Upstash Redis
 * TTL Strategy:
 * - Response Cache: 7 dias
 * - User Session: 24 horas
 * - Embedding Cache: 30 dias
 */

import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

// =====================================================
// Types
// =====================================================

export interface CachedResponse {
  response: string;
  sources: Array<{
    documentId: string;
    documentName: string;
    sourceName: string;
    content: string;
    page?: number;
    score: number;
  }>;
  generatedAt: number;
  hits: number;
}

export interface CachedEmbedding {
  embedding: number[];
  createdAt: number;
}

// =====================================================
// Response Cache (7 dias)
// =====================================================

/**
 * Recuperar resposta em cache
 * Usa hash SHA256 da pergunta normalizada
 */
export async function getCachedResponse(
  questionHash: string
): Promise<CachedResponse | null> {
  try {
    const cached = await redis.get<CachedResponse>(
      `response:${questionHash}`
    );

    if (cached) {
      // Incrementar hit counter
      await redis.hincrby(
        `response:${questionHash}:meta`,
        'hits',
        1
      );
      return cached;
    }

    return null;
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return null; // Falha graciosamente
  }
}

/**
 * Guardar resposta em cache
 * TTL: 7 dias
 */
export async function setCachedResponse(
  questionHash: string,
  response: CachedResponse
): Promise<void> {
  try {
    const TTL_SECONDS = 604800; // 7 dias

    await redis.setex(
      `response:${questionHash}`,
      TTL_SECONDS,
      JSON.stringify(response)
    );

    // Metadados
    await redis.hset(`response:${questionHash}:meta`, {
      createdAt: Date.now(),
      hits: 1,
      questionHash
    });

    await redis.expire(`response:${questionHash}:meta`, TTL_SECONDS);
  } catch (error) {
    console.error('Cache set error:', error);
    // Não falhar a requisição se cache falhar
  }
}

/**
 * Calcular hash da pergunta para cache
 */
export function getQuestionHash(question: string): string {
  return crypto
    .createHash('sha256')
    .update(question.toLowerCase().trim())
    .digest('hex');
}

// =====================================================
// Session Cache (24 horas)
// =====================================================

export interface UserSessionData {
  preferences: Record<string, any>;
  tokenUsageToday: number;
  lastActivity: number;
}

/**
 * Cache de sessão do usuário
 * TTL: 24 horas
 */
export async function cacheUserSession(
  userId: string,
  data: UserSessionData
): Promise<void> {
  try {
    const TTL_SECONDS = 86400; // 24 horas

    await redis.setex(
      `user:${userId}`,
      TTL_SECONDS,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error('User session cache error:', error);
  }
}

/**
 * Recuperar sessão em cache
 */
export async function getUserSessionCache(
  userId: string
): Promise<UserSessionData | null> {
  try {
    const cached = await redis.get<UserSessionData>(
      `user:${userId}`
    );
    return cached || null;
  } catch (error) {
    console.error('User session retrieval error:', error);
    return null;
  }
}

/**
 * Invalidar cache de sessão
 */
export async function invalidateUserSessionCache(userId: string): Promise<void> {
  try {
    await redis.del(`user:${userId}`);
  } catch (error) {
    console.error('Invalidate user session error:', error);
  }
}

// =====================================================
// Embedding Cache (30 dias)
// =====================================================

/**
 * Cache de embeddings para reutilização
 * TTL: 30 dias
 */
export async function cacheEmbedding(
  text: string,
  embedding: number[]
): Promise<void> {
  try {
    const hash = crypto
      .createHash('sha256')
      .update(text.toLowerCase().trim())
      .digest('hex');

    const TTL_SECONDS = 2592000; // 30 dias

    await redis.setex(
      `embedding:${hash}`,
      TTL_SECONDS,
      JSON.stringify({ embedding, createdAt: Date.now() })
    );
  } catch (error) {
    console.error('Embedding cache error:', error);
  }
}

/**
 * Recuperar embedding em cache
 */
export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  try {
    const hash = crypto
      .createHash('sha256')
      .update(text.toLowerCase().trim())
      .digest('hex');

    const cached = await redis.get<CachedEmbedding>(
      `embedding:${hash}`
    );

    return cached?.embedding || null;
  } catch (error) {
    console.error('Embedding retrieval error:', error);
    return null;
  }
}

// =====================================================
// Rate Limit Counter
// =====================================================

/**
 * Incrementar counter de rate limit
 */
export async function incrementRateLimitCounter(
  userId: string
): Promise<number> {
  const key = `ratelimit:${userId}:${new Date().toISOString().split('T')[0]}`;
  const count = await redis.incr(key);

  // Set TTL de 1 dia
  if (count === 1) {
    await redis.expire(key, 86400);
  }

  return count;
}

/**
 * Obter contador de rate limit
 */
export async function getRateLimitCounter(userId: string): Promise<number> {
  const key = `ratelimit:${userId}:${new Date().toISOString().split('T')[0]}`;
  const count = await redis.get<number>(key);
  return count || 0;
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Limpar todo o cache (use com cuidado!)
 */
export async function clearAllCache(): Promise<void> {
  try {
    // Nota: Upstash Redis não tem FLUSHALL em tier gratuito
    // Esta é uma operação manual se necessário
    console.warn('Clearing all cache - use with caution');
  } catch (error) {
    console.error('Clear cache error:', error);
  }
}

/**
 * Obter estatísticas de cache
 */
export async function getCacheStats(): Promise<{
  cacheHits: number;
  cacheSize: number;
}> {
  try {
    // Nota: Precisa de implementação baseado no Redis INFO
    return {
      cacheHits: 0,
      cacheSize: 0
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return { cacheHits: 0, cacheSize: 0 };
  }
}
