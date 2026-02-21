import { createAdminClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'chat_message'
  | 'delete_conversation'
  | 'restore_conversation'
  | 'upload_document'
  | 'delete_document'
  | 'process_document'
  | 'login'
  | 'logout'
  | 'view_document'
  | 'admin_action'
  | 'update_system_file'

export type EntityType =
  | 'conversation'
  | 'message'
  | 'document'
  | 'user'
  | 'source'
  | 'system'

export interface AuditLogData {
  userId: string
  userEmail?: string
  action: AuditAction
  entityType?: EntityType
  entityId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

// Lista de palavras/padrões suspeitos para auto-detecção
const SUSPICIOUS_PATTERNS: string[] = [
  'ignore previous instructions',
  'ignore all instructions',
  'disregard your instructions',
  'system prompt',
  'you are now',
  'act as',
  'pretend you are',
  'jailbreak',
  '<script>',
  'javascript:',
  'onerror=',
  'onload=',
  'DROP TABLE',
  'DELETE FROM',
  'INSERT INTO',
  '\\x00',
]

export async function logAuditAction(data: AuditLogData): Promise<string | null> {
  const adminClient = createAdminClient()

  try {
    const { data: log, error } = await adminClient
      .from('audit_logs')
      .insert({
        user_id: data.userId,
        user_email: data.userEmail,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        details: data.details || {},
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Audit log error:', error)
      return null
    }

    return log?.id || null
  } catch (error) {
    console.error('Audit log failed:', error)
    return null
  }
}

export async function flagContent(data: {
  userId: string
  contentType: 'message' | 'document'
  contentId: string
  contentText: string
  reason: 'inappropriate' | 'spam' | 'offensive' | 'auto_detected' | 'manual'
  severity?: 'low' | 'medium' | 'high' | 'critical'
}): Promise<boolean> {
  const adminClient = createAdminClient()

  try {
    const { error } = await adminClient
      .from('flagged_content')
      .insert({
        user_id: data.userId,
        content_type: data.contentType,
        content_id: data.contentId,
        content_text: data.contentText,
        reason: data.reason,
        severity: data.severity || 'low',
        status: 'pending',
      })

    if (error) {
      console.error('Flag content error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Flag content failed:', error)
    return false
  }
}

// Verifica se o conteúdo contém padrões suspeitos
export function checkSuspiciousContent(text: string): {
  isSuspicious: boolean
  reason?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
} {
  const lowerText = text.toLowerCase()

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (typeof pattern === 'string' && lowerText.includes(pattern)) {
      return {
        isSuspicious: true,
        reason: 'auto_detected',
        severity: 'medium',
      }
    }
  }

  // Verificar comportamento suspeito (mensagens muito longas, repetitivas, etc.)
  if (text.length > 10000) {
    return {
      isSuspicious: true,
      reason: 'spam',
      severity: 'low',
    }
  }

  return { isSuspicious: false }
}

// Obter estatísticas de um usuário
export async function getUserStats(userId: string) {
  const adminClient = createAdminClient()

  try {
    // Buscar IDs das conversas do usuario primeiro
    const { data: userConvs } = await adminClient
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)

    const convIds = userConvs?.map(c => c.id) || []

    // Contar mensagens do usuario (usando IDs das conversas)
    let messageCount = 0
    if (convIds.length > 0) {
      const { count } = await adminClient
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convIds)
      messageCount = count || 0
    }

    // Contar flags
    const { count: flagCount } = await adminClient
      .from('flagged_content')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    return {
      messageCount,
      conversationCount: convIds.length,
      flagCount: flagCount || 0,
    }
  } catch (error) {
    console.error('Get user stats error:', error)
    return null
  }
}

// Obter logs de auditoria (para admin)
export async function getAuditLogs(options: {
  userId?: string
  action?: AuditAction
  limit?: number
  offset?: number
}) {
  const adminClient = createAdminClient()

  try {
    let query = adminClient
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (options.userId) {
      query = query.eq('user_id', options.userId)
    }

    if (options.action) {
      query = query.eq('action', options.action)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get audit logs error:', error)
    return []
  }
}

// Obter conteúdo flagado (para admin)
export async function getFlaggedContent(options: {
  status?: 'pending' | 'reviewed' | 'dismissed' | 'action_taken'
  severity?: 'low' | 'medium' | 'high' | 'critical'
  limit?: number
}) {
  const adminClient = createAdminClient()

  try {
    let query = adminClient
      .from('flagged_content')
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (options.status) {
      query = query.eq('status', options.status)
    }

    if (options.severity) {
      query = query.eq('severity', options.severity)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get flagged content error:', error)
    return []
  }
}
