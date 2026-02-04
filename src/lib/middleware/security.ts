import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generalRateLimiter, getRateLimitHeaders } from '@/lib/ratelimit'
import { secureLog, sanitizeForLog } from '@/lib/logger'
import type { ZodSchema, ZodError } from 'zod'

// Types for the secure handler
interface SecureHandlerOptions<T = unknown> {
  // Authentication options
  requireAuth?: boolean
  requireAdmin?: boolean

  // Rate limiting
  rateLimiter?: {
    limit: (identifier: string) => Promise<{
      success: boolean
      limit: number
      remaining: number
      reset: number
    }>
  }

  // Request validation (Zod schema)
  bodySchema?: ZodSchema<T>
  querySchema?: ZodSchema<unknown>

  // CSRF validation (for non-GET requests)
  validateCsrf?: boolean
}

interface SecureContext<T = unknown> {
  user: {
    id: string
    email?: string
  }
  isAdmin: boolean
  body?: T
  query?: Record<string, string>
  supabase: Awaited<ReturnType<typeof createClient>>
}

type SecureHandler<T = unknown> = (
  request: NextRequest,
  context: SecureContext<T>
) => Promise<NextResponse>

// Security headers to add to all responses
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

/**
 * Creates a secure API handler with built-in:
 * - Authentication validation
 * - Admin role checking
 * - Rate limiting
 * - Request body/query validation with Zod
 * - CSRF protection
 * - Security headers
 * - Secure logging (no sensitive data)
 */
export function createSecureHandler<T = unknown>(
  handler: SecureHandler<T>,
  options: SecureHandlerOptions<T> = {}
): (request: NextRequest) => Promise<NextResponse> {
  const {
    requireAuth = true,
    requireAdmin = false,
    rateLimiter,
    bodySchema,
    querySchema,
    validateCsrf = false,
  } = options

  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()

    try {
      // Initialize Supabase client
      const supabase = await createClient()

      // Check authentication if required
      let user: { id: string; email?: string } | null = null
      let isAdmin = false

      if (requireAuth || requireAdmin) {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
          secureLog('warn', 'Unauthorized access attempt', {
            requestId,
            path: request.nextUrl.pathname,
            method: request.method,
          })
          return addSecurityHeaders(
            NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
          )
        }

        user = { id: authUser.id, email: authUser.email }

        // Check admin role if required
        if (requireAdmin) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authUser.id)
            .single()

          isAdmin = profile?.role === 'admin'

          if (!isAdmin) {
            secureLog('warn', 'Admin access denied', {
              requestId,
              userId: authUser.id,
              path: request.nextUrl.pathname,
            })
            return addSecurityHeaders(
              NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
            )
          }
        } else {
          // Check admin status even if not required (for context)
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authUser.id)
            .single()

          isAdmin = profile?.role === 'admin'
        }
      }

      // Rate limiting
      const limiter = rateLimiter || generalRateLimiter
      const identifier = user?.id || request.headers.get('x-forwarded-for') || 'anonymous'

      const rateLimitResult = await limiter.limit(identifier)

      if (!rateLimitResult.success) {
        secureLog('warn', 'Rate limit exceeded', {
          requestId,
          userId: user?.id,
          path: request.nextUrl.pathname,
        })
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            {
              status: 429,
              headers: getRateLimitHeaders(rateLimitResult)
            }
          )
        )
      }

      // CSRF validation for non-GET requests
      if (validateCsrf && request.method !== 'GET') {
        const csrfToken = request.headers.get('x-csrf-token')
        const cookieCsrf = request.cookies.get('csrf-token')?.value

        if (!csrfToken || !cookieCsrf || csrfToken !== cookieCsrf) {
          secureLog('warn', 'CSRF validation failed', {
            requestId,
            userId: user?.id,
            path: request.nextUrl.pathname,
          })
          return addSecurityHeaders(
            NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
          )
        }
      }

      // Validate request body if schema provided
      let validatedBody: T | undefined
      if (bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const rawBody = await request.json()
          const result = bodySchema.safeParse(rawBody)

          if (!result.success) {
            secureLog('info', 'Request validation failed', {
              requestId,
              userId: user?.id,
              path: request.nextUrl.pathname,
              errors: formatZodErrors(result.error),
            })
            return addSecurityHeaders(
              NextResponse.json(
                {
                  error: 'Invalid request data',
                  details: formatZodErrors(result.error)
                },
                { status: 400 }
              )
            )
          }
          validatedBody = result.data
        } catch {
          return addSecurityHeaders(
            NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
          )
        }
      }

      // Validate query params if schema provided
      let validatedQuery: Record<string, string> | undefined
      if (querySchema) {
        const queryParams = Object.fromEntries(request.nextUrl.searchParams)
        const result = querySchema.safeParse(queryParams)

        if (!result.success) {
          return addSecurityHeaders(
            NextResponse.json(
              {
                error: 'Invalid query parameters',
                details: formatZodErrors(result.error)
              },
              { status: 400 }
            )
          )
        }
        validatedQuery = queryParams
      }

      // Build context
      const context: SecureContext<T> = {
        user: user || { id: 'anonymous' },
        isAdmin,
        body: validatedBody,
        query: validatedQuery,
        supabase,
      }

      // Execute handler
      const response = await handler(request, context)

      // Log successful request
      const duration = Date.now() - startTime
      secureLog('info', 'Request completed', {
        requestId,
        userId: sanitizeForLog(user?.id),
        path: request.nextUrl.pathname,
        method: request.method,
        status: response.status,
        duration: `${duration}ms`,
      })

      // Add security headers and rate limit headers to response
      return addSecurityHeaders(response, getRateLimitHeaders(rateLimitResult))

    } catch (error) {
      const duration = Date.now() - startTime
      secureLog('error', 'Request failed', {
        requestId,
        path: request.nextUrl.pathname,
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })

      return addSecurityHeaders(
        NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      )
    }
  }
}

/**
 * Helper to add security headers to a response
 */
function addSecurityHeaders(
  response: NextResponse,
  additionalHeaders?: Record<string, string>
): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  if (additionalHeaders) {
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }

  return response
}

/**
 * Format Zod errors for API response
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {}

  error.issues.forEach((issue) => {
    const path = issue.path.join('.') || 'root'
    if (!formatted[path]) {
      formatted[path] = []
    }
    formatted[path].push(issue.message)
  })

  return formatted
}

/**
 * Simple handler for routes that don't need full security context
 * but still want security headers and logging
 */
export function createSimpleHandler(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const response = await handler(request)
      return addSecurityHeaders(response)
    } catch (error) {
      secureLog('error', 'Request failed', {
        path: request.nextUrl.pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return addSecurityHeaders(
        NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      )
    }
  }
}
