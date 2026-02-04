import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('ratelimit', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    // Set env vars before importing the module
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: 'https://test-redis.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'test-token',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('getRateLimitHeaders', () => {
    it('should return correct headers format', async () => {
      // Import dynamically after setting env
      const { getRateLimitHeaders } = await import('@/lib/ratelimit')

      const result = {
        limit: 100,
        remaining: 95,
        reset: 1234567890,
      }

      const headers = getRateLimitHeaders(result)

      expect(headers['X-RateLimit-Limit']).toBe('100')
      expect(headers['X-RateLimit-Remaining']).toBe('95')
      expect(headers['X-RateLimit-Reset']).toBe('1234567890')
    })

    it('should handle zero remaining', async () => {
      const { getRateLimitHeaders } = await import('@/lib/ratelimit')

      const result = {
        limit: 10,
        remaining: 0,
        reset: 1234567890,
      }

      const headers = getRateLimitHeaders(result)

      expect(headers['X-RateLimit-Remaining']).toBe('0')
    })
  })

  describe('checkRateLimit', () => {
    it('should return allowed: true when under limit', async () => {
      const { checkRateLimit } = await import('@/lib/ratelimit')

      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 10,
          remaining: 5,
          reset: Date.now() + 60000,
        }),
      }

      const result = await checkRateLimit(mockLimiter as any, 'user-123')

      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(10)
      expect(result.remaining).toBe(5)
      expect(result.retryAfter).toBeUndefined()
    })

    it('should return allowed: false when rate limited', async () => {
      const { checkRateLimit } = await import('@/lib/ratelimit')

      const resetTime = Date.now() + 30000
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: false,
          limit: 10,
          remaining: 0,
          reset: resetTime,
        }),
      }

      const result = await checkRateLimit(mockLimiter as any, 'user-123')

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should calculate retryAfter in seconds', async () => {
      const { checkRateLimit } = await import('@/lib/ratelimit')

      const futureReset = Date.now() + 60000 // 60 seconds from now
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: false,
          limit: 10,
          remaining: 0,
          reset: futureReset,
        }),
      }

      const result = await checkRateLimit(mockLimiter as any, 'user-123')

      // retryAfter should be approximately 60 seconds
      expect(result.retryAfter).toBeGreaterThanOrEqual(59)
      expect(result.retryAfter).toBeLessThanOrEqual(61)
    })
  })
})
