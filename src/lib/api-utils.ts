import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================
// 1. GLOBAL ERROR HANDLER
// ============================================

export interface ApiError {
  error: string
  code?: string
  traceId: string
  details?: any
}

export function generateTraceId(): string {
  return `tr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

export function errorResponse(
  message: string,
  status: number = 500,
  traceId?: string,
  code?: string
): NextResponse<ApiError> {
  const id = traceId || generateTraceId()
  console.error(`[${id}] API Error (${status}): ${message}`)
  return NextResponse.json(
    { error: message, code, traceId: id },
    { status }
  )
}

export function successResponse<T>(data: T, status: number = 200, headers?: Record<string, string>): NextResponse {
  return NextResponse.json(data, { status, headers })
}

// ============================================
// 2. AUTH MIDDLEWARE
// ============================================

interface AuthContext {
  user: { id: string; email?: string }
  profile: { role: string } | null
  traceId: string
}

export async function withAuth(request: Request): Promise<AuthContext | NextResponse> {
  const traceId = generateTraceId()

  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return errorResponse('Unauthorized', 401, traceId, 'AUTH_REQUIRED')
    }

    // Get profile for role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .single()

    return { user, profile, traceId }
  } catch (error) {
    return errorResponse('Authentication failed', 401, traceId, 'AUTH_FAILED')
  }
}

export async function withAdmin(request: Request): Promise<AuthContext | NextResponse> {
  const result = await withAuth(request)

  if (result instanceof NextResponse) return result

  if (result.profile?.role !== 'admin') {
    return errorResponse('Forbidden - Admin access required', 403, result.traceId, 'ADMIN_REQUIRED')
  }

  return result
}

// ============================================
// 3. INPUT VALIDATION
// ============================================

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
  return { success: false, error: errors }
}

// ============================================
// 4. COMMON ZOD SCHEMAS
// ============================================

export const schemas = {
  // Chat
  chatMessage: z.object({
    message: z.string().min(1, 'Mensagem obrigatoria').max(10000, 'Mensagem muito longa (max 10.000 caracteres)'),
    conversationId: z.string().uuid().optional().nullable(),
  }),

  // Search
  searchQuery: z.object({
    topic: z.string().min(1, 'Termo de busca obrigatorio').max(500, 'Termo muito longo'),
    limit: z.number().int().min(1).max(50).optional().default(10),
  }),

  // Daily message generate
  dailyGenerate: z.object({
    topic: z.string().min(1).max(500),
    selectedChunks: z.array(z.object({
      id: z.string(),
      content: z.string(),
      sourceName: z.string().optional(),
      documentName: z.string().optional(),
    })).min(1, 'Selecione ao menos 1 trecho'),
    promptId: z.string().uuid().optional().nullable(),
    customPrompt: z.string().max(50000).optional().nullable(),
    aiProvider: z.enum(['claude', 'chatgpt', 'gemini']).optional().default('claude'),
    category: z.string().max(50).optional().default('daily-teaching'),
  }),

  // Document upload
  documentUpload: z.object({
    name: z.string().min(1, 'Nome obrigatorio').max(255),
    sourceId: z.string().uuid('Source ID invalido'),
    type: z.enum(['pdf', 'transcript', 'text']),
    metadata: z.record(z.string(), z.any()).optional().default({}),
  }),

  // Feedback
  feedback: z.object({
    messageId: z.string().uuid(),
    rating: z.enum(['like', 'dislike']),
    comment: z.string().max(1000).optional(),
    tags: z.array(z.string().max(50)).max(5).optional(),
  }),

  // Prompt creation
  promptCreate: z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minusculas, numeros e hifens'),
    description: z.string().max(500).optional(),
    system_prompt: z.string().min(10, 'Prompt muito curto').max(50000),
    icon: z.string().max(50).optional().default('sparkles'),
    color: z.string().max(50).optional().default('sage'),
    is_public: z.boolean().optional().default(false),
    conversation_starters: z.array(z.string().max(200)).max(10).optional(),
  }),

  // Pagination
  pagination: z.object({
    limit: z.coerce.number().int().min(1).max(300).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
  }),

  // UUID param
  uuid: z.string().uuid('ID invalido'),
}

// ============================================
// 5. SAFE ROUTE WRAPPER
// ============================================

type RouteHandler = (request: Request, context?: any) => Promise<NextResponse>

export function safeRoute(handler: RouteHandler): RouteHandler {
  return async (request: Request, context?: any) => {
    const traceId = generateTraceId()
    try {
      return await handler(request, context)
    } catch (error: any) {
      console.error(`[${traceId}] Unhandled error:`, error?.message || error)
      return errorResponse(
        'Erro interno do servidor. Tente novamente.',
        500,
        traceId,
        'INTERNAL_ERROR'
      )
    }
  }
}
