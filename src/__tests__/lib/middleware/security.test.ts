import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { createSecureHandler, createSimpleHandler } from '@/lib/middleware/security'
import { z } from 'zod'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/ratelimit', () => ({
  generalRateLimiter: {
    limit: vi.fn(),
  },
  getRateLimitHeaders: vi.fn(() => ({
    'X-RateLimit-Limit': '60',
    'X-RateLimit-Remaining': '59',
    'X-RateLimit-Reset': '1234567890',
  })),
}))

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
  sanitizeForLog: vi.fn((val) => val),
}))

// Import mocked modules
import { createClient } from '@/lib/supabase/server'
import { generalRateLimiter } from '@/lib/ratelimit'

// Helper to create mock NextRequest
function createMockRequest(options: {
  method?: string
  url?: string
  body?: object
  headers?: Record<string, string>
  cookies?: Record<string, string>
} = {}): NextRequest {
  const { method = 'GET', url = 'http://localhost/api/test', body, headers = {}, cookies = {} } = options

  const request = new NextRequest(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  })

  // Mock cookies
  Object.entries(cookies).forEach(([name, value]) => {
    vi.spyOn(request.cookies, 'get').mockImplementation((cookieName) => {
      if (cookieName === name) return { name, value }
      return undefined
    })
  })

  return request
}

// Helper to create mock Supabase client
function createMockSupabase(options: {
  user?: { id: string; email?: string } | null
  profile?: { role: string } | null
} = {}) {
  const { user = null, profile = null } = options

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: profile,
            error: null,
          }),
        }),
      }),
    }),
  }
}

describe('Security Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSecureHandler', () => {
    describe('Authentication', () => {
      it('should return 401 when authentication required but no user', async () => {
        const mockSupabase = createMockSupabase({ user: null })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAuth: true }
        )

        const request = createMockRequest()
        const response = await handler(request)

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })

      it('should pass authentication when user exists', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const handler = createSecureHandler(
          async (_req, ctx) => NextResponse.json({ userId: ctx.user.id }),
          { requireAuth: true }
        )

        const request = createMockRequest()
        const response = await handler(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.userId).toBe('user-123')
      })

      it('should work without authentication when not required', async () => {
        const mockSupabase = createMockSupabase({ user: null })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAuth: false }
        )

        const request = createMockRequest()
        const response = await handler(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Admin Authorization', () => {
      it('should return 403 when admin required but user is not admin', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAdmin: true }
        )

        const request = createMockRequest()
        const response = await handler(request)

        expect(response.status).toBe(403)
        const data = await response.json()
        expect(data.error).toBe('Access denied. Admin role required.')
      })

      it('should pass when admin required and user is admin', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'admin-123', email: 'admin@example.com' },
          profile: { role: 'admin' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const handler = createSecureHandler(
          async (_req, ctx) => NextResponse.json({ isAdmin: ctx.isAdmin }),
          { requireAdmin: true }
        )

        const request = createMockRequest()
        const response = await handler(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.isAdmin).toBe(true)
      })
    })

    describe('Rate Limiting', () => {
      it('should return 429 when rate limit exceeded', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: false,
          limit: 60,
          remaining: 0,
          reset: Date.now() + 60000,
        })

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAuth: true }
        )

        const request = createMockRequest()
        const response = await handler(request)

        expect(response.status).toBe(429)
        const data = await response.json()
        expect(data.error).toContain('Rate limit exceeded')
      })

      it('should use custom rate limiter if provided', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)

        const customLimiter = {
          limit: vi.fn().mockResolvedValue({
            success: true,
            limit: 10,
            remaining: 9,
            reset: Date.now() + 60000,
          }),
        }

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAuth: true, rateLimiter: customLimiter }
        )

        const request = createMockRequest()
        await handler(request)

        expect(customLimiter.limit).toHaveBeenCalledWith('user-123')
        expect(generalRateLimiter.limit).not.toHaveBeenCalled()
      })
    })

    describe('Body Validation', () => {
      it('should validate request body with Zod schema', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const TestSchema = z.object({
          name: z.string().min(1),
          email: z.string().email(),
        })

        const handler = createSecureHandler(
          async (_req, ctx) => NextResponse.json({ body: ctx.body }),
          { requireAuth: true, bodySchema: TestSchema }
        )

        const request = createMockRequest({
          method: 'POST',
          body: { name: 'Test User', email: 'test@example.com' },
        })
        const response = await handler(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.body).toEqual({ name: 'Test User', email: 'test@example.com' })
      })

      it('should return 400 when body validation fails', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const TestSchema = z.object({
          name: z.string().min(1),
          email: z.string().email(),
        })

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAuth: true, bodySchema: TestSchema }
        )

        const request = createMockRequest({
          method: 'POST',
          body: { name: '', email: 'invalid-email' },
        })
        const response = await handler(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Invalid request data')
        expect(data.details).toBeDefined()
      })

      it('should return 400 for invalid JSON body', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const TestSchema = z.object({
          name: z.string(),
        })

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAuth: true, bodySchema: TestSchema }
        )

        // Create request with invalid JSON (already consumed body)
        const request = new NextRequest('http://localhost/api/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json{',
        })
        const response = await handler(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Invalid JSON body')
      })
    })

    describe('Query Validation', () => {
      it('should validate query parameters', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const QuerySchema = z.object({
          page: z.string().optional(),
          limit: z.string().optional(),
        })

        const handler = createSecureHandler(
          async (_req, ctx) => NextResponse.json({ query: ctx.query }),
          { requireAuth: true, querySchema: QuerySchema }
        )

        const request = createMockRequest({
          url: 'http://localhost/api/test?page=1&limit=10',
        })
        const response = await handler(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.query).toEqual({ page: '1', limit: '10' })
      })

      it('should return 400 for invalid query params', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const QuerySchema = z.object({
          id: z.string().uuid(),
        })

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAuth: true, querySchema: QuerySchema }
        )

        const request = createMockRequest({
          url: 'http://localhost/api/test?id=not-a-uuid',
        })
        const response = await handler(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Invalid query parameters')
      })
    })

    describe('CSRF Protection', () => {
      it('should validate CSRF token for non-GET requests', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAuth: true, validateCsrf: true }
        )

        const request = createMockRequest({
          method: 'POST',
          headers: { 'x-csrf-token': 'token-123' },
          cookies: { 'csrf-token': 'different-token' },
        })
        const response = await handler(request)

        expect(response.status).toBe(403)
        const data = await response.json()
        expect(data.error).toBe('Invalid CSRF token')
      })

      it('should pass CSRF validation when tokens match', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAuth: true, validateCsrf: true }
        )

        const csrfToken = 'valid-csrf-token'
        const request = new NextRequest('http://localhost/api/test', {
          method: 'POST',
          headers: { 'x-csrf-token': csrfToken },
        })
        // Mock cookie getter
        vi.spyOn(request.cookies, 'get').mockReturnValue({ name: 'csrf-token', value: csrfToken })

        const response = await handler(request)

        expect(response.status).toBe(200)
      })

      it('should skip CSRF validation for GET requests', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAuth: true, validateCsrf: true }
        )

        const request = createMockRequest({ method: 'GET' })
        const response = await handler(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Security Headers', () => {
      it('should add security headers to response', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAuth: true }
        )

        const request = createMockRequest()
        const response = await handler(request)

        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
        expect(response.headers.get('X-Frame-Options')).toBe('DENY')
        expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
        expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      })

      it('should add rate limit headers to response', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const handler = createSecureHandler(
          async () => NextResponse.json({ success: true }),
          { requireAuth: true }
        )

        const request = createMockRequest()
        const response = await handler(request)

        expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('59')
      })
    })

    describe('Error Handling', () => {
      it('should return 500 when handler throws', async () => {
        const mockSupabase = createMockSupabase({
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { role: 'member' },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>)
        vi.mocked(generalRateLimiter.limit).mockResolvedValue({
          success: true,
          limit: 60,
          remaining: 59,
          reset: Date.now() + 60000,
        })

        const handler = createSecureHandler(
          async () => {
            throw new Error('Something went wrong')
          },
          { requireAuth: true }
        )

        const request = createMockRequest()
        const response = await handler(request)

        expect(response.status).toBe(500)
        const data = await response.json()
        expect(data.error).toBe('Internal server error')
      })
    })
  })

  describe('createSimpleHandler', () => {
    it('should add security headers to response', async () => {
      const handler = createSimpleHandler(async () => {
        return NextResponse.json({ success: true })
      })

      const request = createMockRequest()
      const response = await handler(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    })

    it('should return 500 and log when handler throws', async () => {
      const handler = createSimpleHandler(async () => {
        throw new Error('Simple handler error')
      })

      const request = createMockRequest()
      const response = await handler(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })
})
