import { z } from 'zod'

/**
 * Centralized API request schemas
 * All API routes should use these schemas for validation
 */

// ============================================================================
// Chat API Schemas
// ============================================================================

export const ChatRequestSchema = z.object({
  message: z.string()
    .min(1, 'Message is required')
    .max(10000, 'Message too long (max 10000 characters)'),
  conversationId: z.string().uuid('Invalid conversation ID').optional().nullable(),
  themes: z.array(z.string()).optional().nullable(),
  directQuoteMode: z.boolean().optional().default(false),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

// ============================================================================
// AI Settings Schemas
// ============================================================================

const AIProviderSchema = z.enum(['claude', 'chatgpt', 'gemini'])

export const AISettingsUpdateSchema = z.object({
  anthropic_api_key: z.string().optional().nullable(),
  openai_api_key: z.string().optional().nullable(),
  gemini_api_key: z.string().optional().nullable(),
  default_provider: AIProviderSchema.optional().default('claude'),
  claude_model: z.string().optional().default('claude-sonnet-4-20250514'),
  openai_model: z.string().optional().default('gpt-4o'),
  gemini_model: z.string().optional().default('gemini-1.5-pro'),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  max_tokens: z.number().min(100).max(8000).optional().default(1500),
})

export type AISettingsUpdate = z.infer<typeof AISettingsUpdateSchema>

export const AISettingsDeleteQuerySchema = z.object({
  key: z.enum(['anthropic', 'openai', 'gemini']),
})

// ============================================================================
// Conversation Schemas
// ============================================================================

export const ConversationCreateSchema = z.object({
  title: z.string().max(255).optional(),
  module: z.string().default('sri_ab_teachings'),
})

export type ConversationCreate = z.infer<typeof ConversationCreateSchema>

export const ConversationIdSchema = z.object({
  id: z.string().uuid('Invalid conversation ID'),
})

// ============================================================================
// Document Schemas
// ============================================================================

export const DocumentUploadSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  source_id: z.string().uuid('Invalid source ID'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type DocumentUpload = z.infer<typeof DocumentUploadSchema>

export const DocumentIdQuerySchema = z.object({
  id: z.string().uuid('Invalid document ID'),
})

export const DocumentReprocessSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
})

// ============================================================================
// Invite Schemas
// ============================================================================

export const InviteCreateSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email too long'),
  moduleAccess: z.array(z.string()).optional().default([]),
})

export type InviteCreate = z.infer<typeof InviteCreateSchema>

export const InviteIdQuerySchema = z.object({
  id: z.string().uuid('Invalid invite ID'),
})

// ============================================================================
// Prompt Schemas
// ============================================================================

export const PromptCreateSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title too long'),
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content too long'),
  category: z.string().max(100).optional().nullable(),
  is_public: z.boolean().optional().default(false),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .max(100)
    .optional()
    .nullable(),
})

export type PromptCreate = z.infer<typeof PromptCreateSchema>

export const PromptUpdateSchema = PromptCreateSchema.partial()

export type PromptUpdate = z.infer<typeof PromptUpdateSchema>

export const PromptIdQuerySchema = z.object({
  id: z.string().uuid('Invalid prompt ID'),
})

// ============================================================================
// Daily Message Schemas
// ============================================================================

export const DailyMessageGenerateSchema = z.object({
  theme: z.string().optional(),
  forceNew: z.boolean().optional().default(false),
})

export type DailyMessageGenerate = z.infer<typeof DailyMessageGenerateSchema>

export const DailyMessageSearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(500),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
})

export type DailyMessageSearch = z.infer<typeof DailyMessageSearchSchema>

// ============================================================================
// Auth Schemas
// ============================================================================

export const ResetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
})

export type ResetPassword = z.infer<typeof ResetPasswordSchema>

// ============================================================================
// Common Schemas
// ============================================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
})

export type Pagination = z.infer<typeof PaginationSchema>

export const UUIDParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

// ============================================================================
// Theme Schemas
// ============================================================================

export const ThemeSearchSchema = z.object({
  query: z.string().optional(),
  language: z.enum(['pt', 'en', 'es']).optional(),
})

export type ThemeSearch = z.infer<typeof ThemeSearchSchema>
