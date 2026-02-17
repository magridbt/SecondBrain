import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

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

// Lazy Ratelimit instances (created on first use, not at module load)
let _chatRateLimiter: Ratelimit | null = null
let _uploadRateLimiter: Ratelimit | null = null
let _generalRateLimiter: Ratelimit | null = null
let _adminRateLimiter: Ratelimit | null = null
let _authRateLimiter: Ratelimit | null = null

export const chatRateLimiter = {
  limit: (...args: Parameters<Ratelimit['limit']>) => {
    if (!_chatRateLimiter) {
      _chatRateLimiter = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(20, '1 m'),
        analytics: true,
        prefix: 'ratelimit:chat',
      })
    }
    return _chatRateLimiter.limit(...args)
  },
}

export const uploadRateLimiter = {
  limit: (...args: Parameters<Ratelimit['limit']>) => {
    if (!_uploadRateLimiter) {
      _uploadRateLimiter = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(10, '1 h'),
        analytics: true,
        prefix: 'ratelimit:upload',
      })
    }
    return _uploadRateLimiter.limit(...args)
  },
}

export const generalRateLimiter = {
  limit: (...args: Parameters<Ratelimit['limit']>) => {
    if (!_generalRateLimiter) {
      _generalRateLimiter = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: true,
        prefix: 'ratelimit:general',
      })
    }
    return _generalRateLimiter.limit(...args)
  },
}

export const adminRateLimiter = {
  limit: (...args: Parameters<Ratelimit['limit']>) => {
    if (!_adminRateLimiter) {
      _adminRateLimiter = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(50, '1 m'),
        analytics: true,
        prefix: 'ratelimit:admin',
      })
    }
    return _adminRateLimiter.limit(...args)
  },
}

export const authRateLimiter = {
  limit: (...args: Parameters<Ratelimit['limit']>) => {
    if (!_authRateLimiter) {
      _authRateLimiter = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
        prefix: 'ratelimit:auth',
      })
    }
    return _authRateLimiter.limit(...args)
  },
}

// Helper function to get rate limit headers
export function getRateLimitHeaders(result: { limit: number; remaining: number; reset: number }) {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  }
}
