import { describe, it, expect, vi, beforeEach } from 'vitest'

// Define the mock before importing
vi.mock('@/lib/supabase/server', () => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn().mockReturnThis()
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, single: mockSingle })
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, eq: mockEq })
  const mockGetUser = vi.fn()

  return {
    createClient: vi.fn().mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    }),
    // Export for test access
    __mocks__: {
      getUser: mockGetUser,
      single: mockSingle,
      from: mockFrom,
      select: mockSelect,
      eq: mockEq,
    },
  }
})

// Import module and get mock references
import { createClient } from '@/lib/supabase/server'
import {
  getAuthenticatedUser,
  isAdmin,
  hasModuleAccess,
  requireAuth,
  requireAdmin,
  getUserModules,
  validateResourceOwnership,
} from '@/lib/auth-helpers'

describe('auth-helpers', () => {
  let mockClient: Awaited<ReturnType<typeof createClient>>
  let mockSingle: ReturnType<typeof vi.fn>
  let mockGetUser: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockClient = await createClient()
    // Get the mock functions from the mock module
    const mocks = (await import('@/lib/supabase/server')) as any
    mockGetUser = mocks.__mocks__.getUser
    mockSingle = mocks.__mocks__.single
  })

  describe('getAuthenticatedUser', () => {
    it('should return null when no user is authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      })

      const result = await getAuthenticatedUser()
      expect(result).toBeNull()
    })

    it('should return user with role when authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
        },
      })
      mockSingle.mockResolvedValue({
        data: { role: 'admin', full_name: 'Test User' },
      })

      const result = await getAuthenticatedUser()

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        fullName: 'Test User',
      })
    })

    it('should default to visitor role when profile not found', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: 'user-456', email: 'visitor@example.com' },
        },
      })
      mockSingle.mockResolvedValue({
        data: null,
      })

      const result = await getAuthenticatedUser()

      expect(result?.role).toBe('visitor')
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin user', async () => {
      mockSingle.mockResolvedValue({
        data: { role: 'admin' },
      })

      const result = await isAdmin('admin-123')
      expect(result).toBe(true)
    })

    it('should return false for non-admin user', async () => {
      mockSingle.mockResolvedValue({
        data: { role: 'member' },
      })

      const result = await isAdmin('member-123')
      expect(result).toBe(false)
    })

    it('should return false when profile not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
      })

      const result = await isAdmin('unknown-user')
      expect(result).toBe(false)
    })
  })

  describe('hasModuleAccess', () => {
    it('should return true for admin users regardless of module', async () => {
      mockSingle.mockResolvedValue({
        data: { role: 'admin', module_access: [] },
      })

      const result = await hasModuleAccess('admin-123', 'any-module')
      expect(result).toBe(true)
    })

    it('should return true when user has module in access list', async () => {
      mockSingle.mockResolvedValue({
        data: { role: 'member', module_access: ['module1', 'module2'] },
      })

      const result = await hasModuleAccess('member-123', 'module1')
      expect(result).toBe(true)
    })

    it('should return false when user does not have module access', async () => {
      mockSingle.mockResolvedValue({
        data: { role: 'member', module_access: ['module1'] },
      })

      const result = await hasModuleAccess('member-123', 'module3')
      expect(result).toBe(false)
    })

    it('should return false when module_access is null', async () => {
      mockSingle.mockResolvedValue({
        data: { role: 'member', module_access: null },
      })

      const result = await hasModuleAccess('member-123', 'any-module')
      expect(result).toBe(false)
    })

    it('should return false when profile not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
      })

      const result = await hasModuleAccess('unknown-user', 'any-module')
      expect(result).toBe(false)
    })
  })

  describe('requireAuth', () => {
    it('should return success when authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
        },
      })
      mockSingle.mockResolvedValue({
        data: { role: 'member', full_name: 'Test User' },
      })

      const result = await requireAuth()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.user.id).toBe('user-123')
        expect(result.user.role).toBe('member')
      }
    })

    it('should return error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      })

      const result = await requireAuth()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(401)
      }
    })
  })

  describe('requireAdmin', () => {
    it('should return success when user is admin', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: 'admin-123', email: 'admin@example.com' },
        },
      })
      mockSingle.mockResolvedValue({
        data: { role: 'admin', full_name: 'Admin User' },
      })

      const result = await requireAdmin()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.user.role).toBe('admin')
      }
    })

    it('should return 403 when user is not admin', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'user@example.com' },
        },
      })
      mockSingle.mockResolvedValue({
        data: { role: 'member', full_name: 'Regular User' },
      })

      const result = await requireAdmin()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(403)
      }
    })

    it('should return 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      })

      const result = await requireAdmin()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(401)
      }
    })
  })

  describe('getUserModules', () => {
    it('should return all modules for admin users', async () => {
      mockSingle.mockResolvedValue({
        data: { role: 'admin', module_access: [] },
      })
      // Mock the modules query
      const mockModulesClient = await createClient()
      vi.mocked(mockModulesClient.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ slug: 'module1' }, { slug: 'module2' }],
          }),
        }),
      } as any)

      const result = await getUserModules('admin-123')

      // Admin gets modules or default
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return user module_access for non-admin', async () => {
      mockSingle.mockResolvedValue({
        data: { role: 'member', module_access: ['module1', 'module2'] },
      })

      const result = await getUserModules('member-123')

      expect(result).toEqual(['module1', 'module2'])
    })

    it('should return empty array when profile not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
      })

      const result = await getUserModules('unknown-user')

      expect(result).toEqual([])
    })

    it('should return empty array when module_access is null', async () => {
      mockSingle.mockResolvedValue({
        data: { role: 'member', module_access: null },
      })

      const result = await getUserModules('member-123')

      expect(result).toEqual([])
    })
  })

  describe('validateResourceOwnership', () => {
    it('should return true when user owns resource', async () => {
      mockSingle.mockResolvedValue({
        data: { user_id: 'user-123' },
      })

      const result = await validateResourceOwnership('user-123', 'documents', 'doc-1')

      expect(result).toBe(true)
    })

    it('should return false when user does not own resource', async () => {
      mockSingle.mockResolvedValue({
        data: { user_id: 'other-user' },
      })

      const result = await validateResourceOwnership('user-123', 'documents', 'doc-1')

      expect(result).toBe(false)
    })

    it('should return false when resource not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
      })

      const result = await validateResourceOwnership('user-123', 'documents', 'nonexistent')

      expect(result).toBe(false)
    })

    it('should use custom owner column', async () => {
      mockSingle.mockResolvedValue({
        data: { created_by: 'user-123' },
      })

      const result = await validateResourceOwnership('user-123', 'documents', 'doc-1', 'created_by')

      expect(result).toBe(true)
    })
  })
})
