import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Authentication helper types
 */
export interface AuthenticatedUser {
  id: string
  email?: string
  role: 'admin' | 'member' | 'visitor'
  fullName?: string
}

export interface AuthResult {
  success: true
  user: AuthenticatedUser
  supabase: Awaited<ReturnType<typeof createClient>>
}

export interface AuthError {
  success: false
  response: NextResponse
}

/**
 * Get authenticated user from request
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Get profile with role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email,
      role: (profile?.role as 'admin' | 'member' | 'visitor') || 'visitor',
      fullName: profile?.full_name,
    }
  } catch {
    return null
  }
}

/**
 * Require authentication for an API route
 * Returns the authenticated user or an error response
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  // Get profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: (profile?.role as 'admin' | 'member' | 'visitor') || 'visitor',
      fullName: profile?.full_name,
    },
    supabase,
  }
}

/**
 * Require admin role for an API route
 * Returns the authenticated admin user or an error response
 */
export async function requireAdmin(): Promise<AuthResult | AuthError> {
  const authResult = await requireAuth()

  if (!authResult.success) {
    return authResult
  }

  if (authResult.user.role !== 'admin') {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      ),
    }
  }

  return authResult
}

/**
 * Check if a user is an admin
 * Useful for conditional logic without requiring admin access
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    return profile?.role === 'admin'
  } catch {
    return false
  }
}

/**
 * Check if a user has access to a specific module
 */
export async function hasModuleAccess(
  userId: string,
  module: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    // First check if user is admin (admins have access to all modules)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, module_access')
      .eq('id', userId)
      .single()

    if (!profile) {
      return false
    }

    if (profile.role === 'admin') {
      return true
    }

    // Check module_access array
    const moduleAccess = profile.module_access as string[] | null
    if (!moduleAccess) {
      return false
    }

    return moduleAccess.includes(module)
  } catch {
    return false
  }
}

/**
 * Get all modules a user has access to
 */
export async function getUserModules(userId: string): Promise<string[]> {
  try {
    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, module_access')
      .eq('id', userId)
      .single()

    if (!profile) {
      return []
    }

    // Admins have access to all modules
    if (profile.role === 'admin') {
      // Get all available modules
      const { data: modules } = await supabase
        .from('modules')
        .select('slug')
        .eq('is_active', true)

      return modules?.map(m => m.slug) || ['sri_ab_teachings']
    }

    return (profile.module_access as string[]) || []
  } catch {
    return []
  }
}

/**
 * Validate that a user owns a resource
 */
export async function validateResourceOwnership(
  userId: string,
  table: string,
  resourceId: string,
  ownerColumn = 'user_id'
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from(table)
      .select(ownerColumn)
      .eq('id', resourceId)
      .single()

    if (!data) {
      return false
    }

    return (data as unknown as Record<string, unknown>)[ownerColumn] === userId
  } catch {
    return false
  }
}
