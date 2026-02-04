import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sanitizeForLog, secureLog, createRequestLogger, logAuditEvent } from '@/lib/logger'

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sanitizeForLog', () => {
    it('should return null and undefined as-is', () => {
      expect(sanitizeForLog(null)).toBeNull()
      expect(sanitizeForLog(undefined)).toBeUndefined()
    })

    it('should return numbers and booleans as-is', () => {
      expect(sanitizeForLog(42)).toBe(42)
      expect(sanitizeForLog(true)).toBe(true)
      expect(sanitizeForLog(false)).toBe(false)
    })

    it('should redact known sensitive field names', () => {
      const input = {
        username: 'john',
        password: 'secret123',
        apiKey: 'sk-12345',
        token: 'jwt-token',
        email: 'test@example.com',
      }

      const result = sanitizeForLog(input) as Record<string, unknown>

      expect(result.username).toBe('john')
      expect(result.password).toBe('[REDACTED]')
      expect(result.apiKey).toBe('[REDACTED]')
      expect(result.token).toBe('[REDACTED]')
    })

    it('should partially mask emails', () => {
      const result = sanitizeForLog('john@example.com')
      expect(result).toBe('jo***@example.com')
    })

    it('should partially mask long alphanumeric strings (potential tokens)', () => {
      const longToken = 'abcdefghijklmnopqrstuvwxyz1234567890'
      const result = sanitizeForLog(longToken)
      expect(result).toBe('abcd...7890')
    })

    it('should recursively sanitize nested objects', () => {
      const input = {
        user: {
          id: '123',
          password: 'secret',
        },
        metadata: {
          apiKey: 'key123',
        },
      }

      const result = sanitizeForLog(input) as Record<string, Record<string, unknown>>

      expect(result.user.id).toBe('123')
      expect(result.user.password).toBe('[REDACTED]')
      expect(result.metadata.apiKey).toBe('[REDACTED]')
    })

    it('should sanitize arrays', () => {
      const input = ['public', 'secret-token-abc123456789012345678901234567890']
      const result = sanitizeForLog(input) as string[]

      expect(result[0]).toBe('public')
      expect(result[1]).toContain('...')
    })

    it('should redact fields with sensitive patterns', () => {
      const input = {
        authorization: 'Bearer token123',
        session_id: 'sess_123',
        credit_card: '4111111111111111',
      }

      const result = sanitizeForLog(input) as Record<string, unknown>

      expect(result.authorization).toBe('[REDACTED]')
      expect(result.session_id).toBe('[REDACTED]')
      expect(result.credit_card).toBe('[REDACTED]')
    })
  })

  describe('secureLog', () => {
    it('should log info level messages', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      secureLog('info', 'Test message', { userId: '123' })

      expect(consoleSpy).toHaveBeenCalled()
      const loggedArg = consoleSpy.mock.calls[0][0]
      expect(loggedArg).toContain('Test message')
      expect(loggedArg).toContain('123')
    })

    it('should log warn level messages', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      secureLog('warn', 'Warning message')

      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should log error level messages', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      secureLog('error', 'Error message', { error: 'Something went wrong' })

      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should sanitize sensitive data in logs', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      secureLog('info', 'User logged in', {
        userId: '123',
        password: 'secret',
        apiKey: 'sk-12345',
      })

      const loggedArg = consoleSpy.mock.calls[0][0]
      expect(loggedArg).toContain('[REDACTED]')
      expect(loggedArg).not.toContain('secret')
      expect(loggedArg).not.toContain('sk-12345')
    })
  })

  describe('createRequestLogger', () => {
    it('should create a logger with info, warn, error, and complete methods', () => {
      const logger = createRequestLogger('req-123', '/api/test')

      expect(logger.info).toBeDefined()
      expect(logger.warn).toBeDefined()
      expect(logger.error).toBeDefined()
      expect(logger.complete).toBeDefined()
    })

    it('should include requestId and path in all logs', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const logger = createRequestLogger('req-123', '/api/test')

      logger.info('Test info')

      const loggedArg = consoleSpy.mock.calls[0][0]
      expect(loggedArg).toContain('req-123')
      expect(loggedArg).toContain('/api/test')
    })

    it('should log completion with duration', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const logger = createRequestLogger('req-123', '/api/test')

      // Wait a bit to ensure duration > 0
      logger.complete(200)

      const loggedArg = consoleSpy.mock.calls[0][0]
      expect(loggedArg).toContain('Request completed')
      expect(loggedArg).toContain('200')
      expect(loggedArg).toContain('ms')
    })
  })

  describe('logAuditEvent', () => {
    it('should log audit events with action and userId', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      logAuditEvent('user_login', 'user-123', { ip: '192.168.1.1' })

      const loggedArg = consoleSpy.mock.calls[0][0]
      expect(loggedArg).toContain('AUDIT: user_login')
      expect(loggedArg).toContain('user_login')
    })

    it('should include audit timestamp', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      logAuditEvent('document_upload', 'user-123', { documentId: 'doc-456' })

      const loggedArg = consoleSpy.mock.calls[0][0]
      expect(loggedArg).toContain('auditTimestamp')
    })
  })
})
