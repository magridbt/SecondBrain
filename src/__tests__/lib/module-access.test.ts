import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getUserModules,
  hasModuleAccess,
  isSystemAdmin,
  canAccessModule,
  getRequiredModuleForRoute,
  moduleRoutes,
} from '@/lib/module-access'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

// Helper to create mock Supabase admin client
function createMockAdminClient(options: {
  userModulesData?: Array<{
    module_id: string
    role: string
    modules: { id: string; slug: string; name: string }
  }> | null
  profileData?: { role: string } | null
  error?: Error | null
} = {}) {
  const { userModulesData = null, profileData = null, error = null } = options

  return {
    from: vi.fn((table: string) => {
      if (table === 'user_modules') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: userModulesData,
              error,
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: profileData,
                error,
              }),
            }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error }),
        }),
      }
    }),
  }
}

describe('module-access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRequiredModuleForRoute (pure function)', () => {
    it('should return module slug for chat route', () => {
      expect(getRequiredModuleForRoute('/app/chat')).toBe('sri-ab-teachings')
      expect(getRequiredModuleForRoute('/app/chat/conversation-123')).toBe('sri-ab-teachings')
    })

    it('should return module slug for admin route', () => {
      expect(getRequiredModuleForRoute('/app/admin')).toBe('sri-ab-teachings')
      expect(getRequiredModuleForRoute('/app/admin/documents')).toBe('sri-ab-teachings')
    })

    it('should return module slug for daily-teaching route', () => {
      expect(getRequiredModuleForRoute('/app/daily-teaching')).toBe('daily-teaching')
      expect(getRequiredModuleForRoute('/app/daily-teaching/generate')).toBe('daily-teaching')
    })

    it('should return module slug for social route', () => {
      expect(getRequiredModuleForRoute('/app/social')).toBe('social-media')
      expect(getRequiredModuleForRoute('/app/social/posts')).toBe('social-media')
    })

    it('should return null for unmatched routes', () => {
      expect(getRequiredModuleForRoute('/app/settings')).toBeNull()
      expect(getRequiredModuleForRoute('/api/health')).toBeNull()
      expect(getRequiredModuleForRoute('/')).toBeNull()
    })
  })

  describe('moduleRoutes', () => {
    it('should have correct routes for sri-ab-teachings', () => {
      expect(moduleRoutes['sri-ab-teachings']).toContain('/app/chat')
      expect(moduleRoutes['sri-ab-teachings']).toContain('/app/admin')
    })

    it('should have correct routes for daily-teaching', () => {
      expect(moduleRoutes['daily-teaching']).toContain('/app/daily-teaching')
    })

    it('should have correct routes for social-media', () => {
      expect(moduleRoutes['social-media']).toContain('/app/social')
    })
  })

  describe('getUserModules', () => {
    it('should return user modules when data exists', async () => {
      const mockAdminClient = createMockAdminClient({
        userModulesData: [
          {
            module_id: 'module-1',
            role: 'admin',
            modules: { id: 'module-1', slug: 'sri-ab-teachings', name: 'Sri AB Teachings' },
          },
          {
            module_id: 'module-2',
            role: 'viewer',
            modules: { id: 'module-2', slug: 'daily-teaching', name: 'Daily Teaching' },
          },
        ],
      })
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

      const result = await getUserModules('user-123')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        module_id: 'module-1',
        module_slug: 'sri-ab-teachings',
        module_name: 'Sri AB Teachings',
        role: 'admin',
      })
      expect(result[1].role).toBe('viewer')
    })

    it('should return empty array when no modules', async () => {
      const mockAdminClient = createMockAdminClient({
        userModulesData: [],
      })
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

      const result = await getUserModules('user-123')

      expect(result).toEqual([])
    })

    it('should return empty array on error', async () => {
      const mockAdminClient = createMockAdminClient({
        userModulesData: null,
        error: new Error('Database error'),
      })
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

      const result = await getUserModules('user-123')

      expect(result).toEqual([])
    })
  })

  describe('hasModuleAccess', () => {
    it('should return hasAccess true when user has module', async () => {
      const mockAdminClient = createMockAdminClient({
        userModulesData: [
          {
            module_id: 'module-1',
            role: 'editor',
            modules: { id: 'module-1', slug: 'sri-ab-teachings', name: 'Sri AB Teachings' },
          },
        ],
      })
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

      const result = await hasModuleAccess('user-123', 'sri-ab-teachings')

      expect(result.hasAccess).toBe(true)
      expect(result.role).toBe('editor')
    })

    it('should return hasAccess false when user does not have module', async () => {
      const mockAdminClient = createMockAdminClient({
        userModulesData: [
          {
            module_id: 'module-1',
            role: 'viewer',
            modules: { id: 'module-1', slug: 'other-module', name: 'Other Module' },
          },
        ],
      })
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

      const result = await hasModuleAccess('user-123', 'sri-ab-teachings')

      expect(result.hasAccess).toBe(false)
      expect(result.role).toBeNull()
    })
  })

  describe('isSystemAdmin', () => {
    it('should return true for admin role', async () => {
      const mockAdminClient = createMockAdminClient({
        profileData: { role: 'admin' },
      })
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

      const result = await isSystemAdmin('admin-123')

      expect(result).toBe(true)
    })

    it('should return false for non-admin role', async () => {
      const mockAdminClient = createMockAdminClient({
        profileData: { role: 'member' },
      })
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

      const result = await isSystemAdmin('user-123')

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      const mockAdminClient = createMockAdminClient({
        profileData: null,
        error: new Error('Not found'),
      })
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

      const result = await isSystemAdmin('unknown-user')

      expect(result).toBe(false)
    })
  })

  describe('canAccessModule', () => {
    it('should return canAccess true for system admin', async () => {
      // First call is for isSystemAdmin (profiles table)
      // Second call would be for getUserModules (user_modules table)
      const mockAdminClient = {
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { role: 'admin' },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }),
      }
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

      const result = await canAccessModule('admin-123', 'any-module')

      expect(result.canAccess).toBe(true)
      expect(result.isAdmin).toBe(true)
      expect(result.role).toBe('admin')
    })

    it('should check module access for non-admin users', async () => {
      // First call returns non-admin profile
      // Second call returns module access
      let callCount = 0
      const mockAdminClient = {
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { role: 'member' },
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'user_modules') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      module_id: 'module-1',
                      role: 'viewer',
                      modules: { id: 'module-1', slug: 'sri-ab-teachings', name: 'Sri AB' },
                    },
                  ],
                  error: null,
                }),
              }),
            }
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }),
      }
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

      const result = await canAccessModule('user-123', 'sri-ab-teachings')

      expect(result.canAccess).toBe(true)
      expect(result.isAdmin).toBe(false)
      expect(result.role).toBe('viewer')
    })

    it('should return canAccess false when no access', async () => {
      const mockAdminClient = {
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { role: 'member' },
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'user_modules') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }),
      }
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

      const result = await canAccessModule('user-123', 'restricted-module')

      expect(result.canAccess).toBe(false)
      expect(result.isAdmin).toBe(false)
      expect(result.role).toBeNull()
    })
  })
})
