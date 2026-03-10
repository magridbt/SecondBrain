import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Fallback response when Redis is unavailable
const FALLBACK_RESULT = { success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 }

// Lazy Redis client (singleton) - avoids crash if env vars missing at build time
let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

// Resilient wrapper: if Redis/Upstash fails, allow request through instead of crashing
function createResilientLimiter(
  getInstance: () => Ratelimit,
  instanceRef: { current: Ratelimit | null }
) {
  return {
    limit: async (...args: Parameters<Ratelimit['limit']>) => {
      try {
        if (!instanceRef.current) {
          instanceRef.current = getInstance()
        }
        return await instanceRef.current.limit(...args)
      } catch (error) {
        console.error('[RateLimit] Redis unavailable, allowing request:', error instanceof Error ? error.message : error)
        return FALLBACK_RESULT
      }
    },
  }
}

// Lazy Ratelimit instances (created on first use, not at module load)
const _chatRef: { current: Ratelimit | null } = { current: null }
const _uploadRef: { current: Ratelimit | null } = { current: null }
const _generalRef: { current: Ratelimit | null } = { current: null }
const _adminRef: { current: Ratelimit | null } = { current: null }
const _authRef: { current: Ratelimit | null } = { current: null }

export const chatRateLimiter = createResilientLimiter(
  () => new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(20, '1 m'), analytics: true, prefix: 'ratelimit:chat' }),
  _chatRef
)

export const uploadRateLimiter = createResilientLimiter(
  () => new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(10, '1 h'), analytics: true, prefix: 'ratelimit:upload' }),
  _uploadRef
)

export const generalRateLimiter = createResilientLimiter(
  () => new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(100, '1 m'), analytics: true, prefix: 'ratelimit:general' }),
  _generalRef
)

export const adminRateLimiter = createResilientLimiter(
  () => new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(50, '1 m'), analytics: true, prefix: 'ratelimit:admin' }),
  _adminRef
)

export const authRateLimiter = createResilientLimiter(
  () => new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(10, '1 m'), analytics: true, prefix: 'ratelimit:auth' }),
  _authRef
)

// Helper function to get rate limit headers
export function getRateLimitHeaders(result: { limit: number; remaining: number; reset: number }) {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  }
}
