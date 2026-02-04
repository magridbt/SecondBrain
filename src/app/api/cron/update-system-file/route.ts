/**
 * API Route: Cron Job para Atualização do SystemFile.md
 *
 * Este endpoint é chamado automaticamente pelo Vercel Cron a cada 7 dias
 * para atualizar a lista de documentos de ensinamentos no SystemFile.md
 *
 * Configuração: vercel.json -> crons
 * Frequência: A cada 7 dias (Domingos às 03:00 UTC)
 *
 * @endpoint POST /api/cron/update-system-file
 * @auth CRON_SECRET ou Admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateSystemFile } from '@/lib/update-system-file'
import { createClient } from '@/lib/supabase/server'
import { logAuditAction } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Verifica se a requisição é válida (vem do Vercel Cron ou é admin)
 */
async function isAuthorized(request: NextRequest): Promise<{ authorized: boolean; source: string }> {
  // 1. Verificar CRON_SECRET do Vercel
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true, source: 'vercel-cron' }
  }

  // 2. Verificar se é admin autenticado
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        return { authorized: true, source: `admin:${user.email}` }
      }
    }
  } catch {
    // Silently fail auth check
  }

  // 3. Permitir em desenvolvimento local
  if (process.env.NODE_ENV === 'development') {
    return { authorized: true, source: 'development' }
  }

  return { authorized: false, source: 'unauthorized' }
}

/**
 * POST - Executar atualização do SystemFile.md
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verificar autorização
    const { authorized, source } = await isAuthorized(request)

    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Use CRON_SECRET or admin authentication.' },
        { status: 401 }
      )
    }

    console.log(`[CRON] Iniciando atualização do SystemFile.md - Source: ${source}`)

    // Executar a atualização
    const result = await updateSystemFile()

    const duration = Date.now() - startTime

    // Log de auditoria
    await logAuditAction({
      userId: 'system',
      userEmail: 'cron@system',
      action: 'update_system_file',
      entityType: 'system',
      entityId: 'SystemFile.md',
      details: {
        source,
        success: result.success,
        documentCount: result.documentCount,
        duration: `${duration}ms`,
        message: result.message
      }
    }).catch(err => console.error('Audit log error:', err))

    if (result.success) {
      console.log(`[CRON] SystemFile.md atualizado com sucesso em ${duration}ms`)

      return NextResponse.json({
        success: true,
        message: result.message,
        documentCount: result.documentCount,
        duration: `${duration}ms`,
        source,
        nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    } else {
      console.error(`[CRON] Falha ao atualizar SystemFile.md: ${result.message}`)

      return NextResponse.json({
        success: false,
        error: result.message,
        duration: `${duration}ms`,
        source
      }, { status: 500 })
    }

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[CRON] Erro interno:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      duration: `${duration}ms`
    }, { status: 500 })
  }
}

/**
 * GET - Verificar status do cron job
 */
export async function GET() {
  return NextResponse.json({
    name: 'update-system-file',
    description: 'Atualiza automaticamente o SystemFile.md com a lista de documentos de ensinamentos',
    schedule: '0 3 * * 0', // Domingos às 03:00 UTC
    frequency: 'A cada 7 dias',
    lastConfigured: '23/01/2026',
    endpoints: {
      trigger: 'POST /api/cron/update-system-file',
      status: 'GET /api/cron/update-system-file'
    },
    nextScheduledRun: getNextSunday().toISOString()
  })
}

/**
 * Calcula o próximo domingo às 03:00 UTC
 */
function getNextSunday(): Date {
  const now = new Date()
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7
  const nextSunday = new Date(now)
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday)
  nextSunday.setUTCHours(3, 0, 0, 0)
  return nextSunday
}
