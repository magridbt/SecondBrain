import { createClient, createAdminClient } from '@/lib/supabase/server'

export type ModuleRole = 'admin' | 'editor' | 'viewer'

export interface UserModuleAccess {
  module_id: string
  module_slug: string
  module_name: string
  role: ModuleRole
}

/**
 * Get all modules a user has access to
 */
export async function getUserModules(userId: string): Promise<UserModuleAccess[]> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('user_modules')
    .select(`
      module_id,
      role,
      modules (
        id,
        slug,
        name
      )
    `)
    .eq('user_id', userId)

  if (error || !data) {
    console.error('Error fetching user modules:', error)
    return []
  }

  return data.map((item: any) => ({
    module_id: item.modules.id,
    module_slug: item.modules.slug,
    module_name: item.modules.name,
    role: item.role as ModuleRole,
  }))
}

/**
 * Check if user has access to a specific module by slug
 */
export async function hasModuleAccess(
  userId: string,
  moduleSlug: string
): Promise<{ hasAccess: boolean; role: ModuleRole | null }> {
  const modules = await getUserModules(userId)
  const moduleAccess = modules.find(m => m.module_slug === moduleSlug)

  if (moduleAccess) {
    return { hasAccess: true, role: moduleAccess.role }
  }

  return { hasAccess: false, role: null }
}

/**
 * Check if user is a system admin (can access everything)
 */
export async function isSystemAdmin(userId: string): Promise<boolean> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) return false

  return data.role === 'admin'
}

/**
 * Check if user can access a module (either has specific access or is system admin)
 */
export async function canAccessModule(
  userId: string,
  moduleSlug: string
): Promise<{ canAccess: boolean; role: ModuleRole | null; isAdmin: boolean }> {
  // Check if system admin first
  const admin = await isSystemAdmin(userId)
  if (admin) {
    return { canAccess: true, role: 'admin', isAdmin: true }
  }

  // Check specific module access
  const { hasAccess, role } = await hasModuleAccess(userId, moduleSlug)
  return { canAccess: hasAccess, role, isAdmin: false }
}

/**
 * Module slug to route mapping
 */
export const moduleRoutes: Record<string, string[]> = {
  'sri-ab-teachings': ['/app/chat', '/app/admin'],
  'daily-teaching': ['/app/daily-teaching'],
  'social-media': ['/app/social-media'],
  'cursos': ['/app/cursos'],
}

/**
 * Get required module for a route
 */
export function getRequiredModuleForRoute(pathname: string): string | null {
  for (const [moduleSlug, routes] of Object.entries(moduleRoutes)) {
    for (const route of routes) {
      if (pathname.startsWith(route)) {
        return moduleSlug
      }
    }
  }
  return null
}
