/**
 * Secure logging utilities
 * Ensures no sensitive data is logged
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Patterns that indicate sensitive data
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /bearer/i,
  /session/i,
  /cookie/i,
  /jwt/i,
  /private/i,
]

// Fields to always redact
const REDACTED_FIELDS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'confirmPassword',
  'apiKey',
  'api_key',
  'apikey',
  'secret',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'cookie',
  'session',
  'sessionId',
  'session_id',
  'jwt',
  'bearer',
  'credentials',
  'credit_card',
  'creditCard',
  'ssn',
  'social_security',
  'anthropic_api_key',
  'openai_api_key',
  'gemini_api_key',
  'encryption_key',
  'ENCRYPTION_KEY',
  'supabase_service_role_key',
  'SUPABASE_SERVICE_ROLE_KEY',
])

/**
 * Sanitize a value for logging
 * Redacts sensitive information
 */
export function sanitizeForLog(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    // Check if the string looks like sensitive data
    if (value.length > 20 && /^[a-zA-Z0-9+/=_-]+$/.test(value)) {
      // Looks like a token or key - redact most of it
      return `${value.slice(0, 4)}...${value.slice(-4)}`
    }
    // Check for email patterns - redact domain
    if (value.includes('@')) {
      const [local, domain] = value.split('@')
      if (domain) {
        return `${local.slice(0, 2)}***@${domain}`
      }
    }
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForLog)
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      // Check if this key should be redacted
      if (REDACTED_FIELDS.has(key) || SENSITIVE_PATTERNS.some(p => p.test(key))) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = sanitizeForLog(val)
      }
    }
    return sanitized
  }

  return '[UNKNOWN_TYPE]'
}

/**
 * Secure logging function
 * Automatically sanitizes all data before logging
 */
export function secureLog(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString()
  const sanitizedData = data ? sanitizeForLog(data) : undefined

  const logEntry = {
    timestamp,
    level,
    message,
    ...(sanitizedData && typeof sanitizedData === 'object' ? sanitizedData : { data: sanitizedData }),
  }

  switch (level) {
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(JSON.stringify(logEntry))
      }
      break
    case 'info':
      console.info(JSON.stringify(logEntry))
      break
    case 'warn':
      console.warn(JSON.stringify(logEntry))
      break
    case 'error':
      console.error(JSON.stringify(logEntry))
      break
  }
}

/**
 * Create a request logger that tracks request lifecycle
 */
export function createRequestLogger(requestId: string, path: string) {
  const startTime = Date.now()

  return {
    info: (message: string, data?: Record<string, unknown>) => {
      secureLog('info', message, { requestId, path, ...data })
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      secureLog('warn', message, { requestId, path, ...data })
    },
    error: (message: string, data?: Record<string, unknown>) => {
      secureLog('error', message, { requestId, path, ...data })
    },
    complete: (status: number, data?: Record<string, unknown>) => {
      const duration = Date.now() - startTime
      secureLog('info', 'Request completed', {
        requestId,
        path,
        status,
        duration: `${duration}ms`,
        ...data,
      })
    },
  }
}

/**
 * Log an audit event (for important actions)
 */
export function logAuditEvent(
  action: string,
  userId: string | undefined,
  details: Record<string, unknown>
): void {
  secureLog('info', `AUDIT: ${action}`, {
    action,
    userId: sanitizeForLog(userId),
    ...details,
    auditTimestamp: new Date().toISOString(),
  })
}
