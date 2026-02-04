import { describe, it, expect } from 'vitest'
import {
  ChatRequestSchema,
  AISettingsUpdateSchema,
  InviteCreateSchema,
  PromptCreateSchema,
  ResetPasswordSchema,
  PaginationSchema,
  UUIDParamSchema,
} from '@/lib/schemas/api'

describe('API Schemas', () => {
  describe('ChatRequestSchema', () => {
    it('should accept valid chat request', () => {
      const validRequest = {
        message: 'What is the meaning of life?',
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
        themes: ['spirituality', 'wisdom'],
        directQuoteMode: false,
      }

      const result = ChatRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should accept message with only required fields', () => {
      const validRequest = {
        message: 'Hello',
      }

      const result = ChatRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject empty message', () => {
      const invalidRequest = {
        message: '',
      }

      const result = ChatRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject message that is too long', () => {
      const invalidRequest = {
        message: 'x'.repeat(10001),
      }

      const result = ChatRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject invalid conversation ID format', () => {
      const invalidRequest = {
        message: 'Hello',
        conversationId: 'not-a-uuid',
      }

      const result = ChatRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should allow null conversationId', () => {
      const validRequest = {
        message: 'Hello',
        conversationId: null,
      }

      const result = ChatRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })
  })

  describe('AISettingsUpdateSchema', () => {
    it('should accept valid AI settings', () => {
      const validSettings = {
        default_provider: 'claude',
        claude_model: 'claude-sonnet-4-20250514',
        temperature: 0.7,
        max_tokens: 1500,
      }

      const result = AISettingsUpdateSchema.safeParse(validSettings)
      expect(result.success).toBe(true)
    })

    it('should accept API keys', () => {
      const validSettings = {
        anthropic_api_key: 'sk-ant-123456',
        openai_api_key: 'sk-proj-123456',
      }

      const result = AISettingsUpdateSchema.safeParse(validSettings)
      expect(result.success).toBe(true)
    })

    it('should reject invalid provider', () => {
      const invalidSettings = {
        default_provider: 'invalid-provider',
      }

      const result = AISettingsUpdateSchema.safeParse(invalidSettings)
      expect(result.success).toBe(false)
    })

    it('should reject temperature out of range', () => {
      const invalidSettings = {
        temperature: 3.0,
      }

      const result = AISettingsUpdateSchema.safeParse(invalidSettings)
      expect(result.success).toBe(false)
    })

    it('should reject max_tokens out of range', () => {
      const invalidSettings = {
        max_tokens: 50, // Below minimum of 100
      }

      const result = AISettingsUpdateSchema.safeParse(invalidSettings)
      expect(result.success).toBe(false)
    })
  })

  describe('InviteCreateSchema', () => {
    it('should accept valid invite', () => {
      const validInvite = {
        email: 'user@example.com',
        moduleAccess: ['sri_ab_teachings'],
      }

      const result = InviteCreateSchema.safeParse(validInvite)
      expect(result.success).toBe(true)
    })

    it('should accept invite with just email', () => {
      const validInvite = {
        email: 'user@example.com',
      }

      const result = InviteCreateSchema.safeParse(validInvite)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.moduleAccess).toEqual([])
      }
    })

    it('should reject invalid email', () => {
      const invalidInvite = {
        email: 'not-an-email',
      }

      const result = InviteCreateSchema.safeParse(invalidInvite)
      expect(result.success).toBe(false)
    })

    it('should reject email that is too long', () => {
      const invalidInvite = {
        email: 'x'.repeat(250) + '@example.com',
      }

      const result = InviteCreateSchema.safeParse(invalidInvite)
      expect(result.success).toBe(false)
    })
  })

  describe('PromptCreateSchema', () => {
    it('should accept valid prompt', () => {
      const validPrompt = {
        title: 'My Prompt',
        content: 'You are a helpful assistant that helps with various tasks.',
      }

      const result = PromptCreateSchema.safeParse(validPrompt)
      expect(result.success).toBe(true)
    })

    it('should require title and content', () => {
      const invalidPrompt = {
        category: 'Missing required fields',
      }

      const result = PromptCreateSchema.safeParse(invalidPrompt)
      expect(result.success).toBe(false)
    })

    it('should provide default values', () => {
      const minimalPrompt = {
        title: 'My Prompt',
        content: 'You are helpful and assist users with their questions.',
      }

      const result = PromptCreateSchema.safeParse(minimalPrompt)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_public).toBe(false)
        expect(result.data.category).toBeUndefined()
        expect(result.data.slug).toBeUndefined()
      }
    })

    it('should reject title that is too long', () => {
      const invalidPrompt = {
        title: 'x'.repeat(300),
        content: 'Test content',
      }

      const result = PromptCreateSchema.safeParse(invalidPrompt)
      expect(result.success).toBe(false)
    })
  })

  describe('ResetPasswordSchema', () => {
    it('should accept valid password', () => {
      const validPassword = {
        password: 'SecurePass123',
      }

      const result = ResetPasswordSchema.safeParse(validPassword)
      expect(result.success).toBe(true)
    })

    it('should reject password too short', () => {
      const invalidPassword = {
        password: 'Short1',
      }

      const result = ResetPasswordSchema.safeParse(invalidPassword)
      expect(result.success).toBe(false)
    })

    it('should reject password without uppercase', () => {
      const invalidPassword = {
        password: 'lowercase123',
      }

      const result = ResetPasswordSchema.safeParse(invalidPassword)
      expect(result.success).toBe(false)
    })

    it('should reject password without lowercase', () => {
      const invalidPassword = {
        password: 'UPPERCASE123',
      }

      const result = ResetPasswordSchema.safeParse(invalidPassword)
      expect(result.success).toBe(false)
    })

    it('should reject password without number', () => {
      const invalidPassword = {
        password: 'NoNumbersHere',
      }

      const result = ResetPasswordSchema.safeParse(invalidPassword)
      expect(result.success).toBe(false)
    })
  })

  describe('PaginationSchema', () => {
    it('should accept valid pagination', () => {
      const validPagination = {
        page: '2',
        limit: '50',
      }

      const result = PaginationSchema.safeParse(validPagination)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(50)
      }
    })

    it('should provide default values', () => {
      const emptyPagination = {}

      const result = PaginationSchema.safeParse(emptyPagination)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('should reject page less than 1', () => {
      const invalidPagination = {
        page: '0',
      }

      const result = PaginationSchema.safeParse(invalidPagination)
      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const invalidPagination = {
        limit: '200',
      }

      const result = PaginationSchema.safeParse(invalidPagination)
      expect(result.success).toBe(false)
    })
  })

  describe('UUIDParamSchema', () => {
    it('should accept valid UUID', () => {
      const validUUID = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      }

      const result = UUIDParamSchema.safeParse(validUUID)
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID format', () => {
      const invalidUUID = {
        id: 'not-a-valid-uuid',
      }

      const result = UUIDParamSchema.safeParse(invalidUUID)
      expect(result.success).toBe(false)
    })

    it('should reject empty string', () => {
      const emptyUUID = {
        id: '',
      }

      const result = UUIDParamSchema.safeParse(emptyUUID)
      expect(result.success).toBe(false)
    })
  })
})
