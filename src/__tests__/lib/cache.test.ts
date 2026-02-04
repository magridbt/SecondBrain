import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('cache', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('cacheGet', () => {
    it('should return null when Redis is not configured', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { cacheGet } = await import('@/lib/cache')
      const result = await cacheGet('test-key')
      expect(result).toBeNull()
    })
  })

  describe('cacheSet', () => {
    it('should return false when Redis is not configured', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { cacheSet } = await import('@/lib/cache')
      const result = await cacheSet('test-key', 'test-value', 300)
      expect(result).toBe(false)
    })
  })

  describe('cacheDelete', () => {
    it('should return false when Redis is not configured', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { cacheDelete } = await import('@/lib/cache')
      const result = await cacheDelete('test-key')
      expect(result).toBe(false)
    })
  })

  describe('cachedIsAdmin', () => {
    it('should call fetchFn when Redis not configured (no cache)', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { cachedIsAdmin } = await import('@/lib/cache')
      const fetchFn = vi.fn().mockResolvedValue(true)

      const result = await cachedIsAdmin('user-123', fetchFn)

      expect(fetchFn).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  describe('cachedUserModules', () => {
    it('should call fetchFn when Redis not configured (no cache)', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { cachedUserModules } = await import('@/lib/cache')
      const modules = ['module1', 'module2']
      const fetchFn = vi.fn().mockResolvedValue(modules)

      const result = await cachedUserModules('user-123', fetchFn)

      expect(fetchFn).toHaveBeenCalled()
      expect(result).toEqual(modules)
    })

    it('should return what fetchFn returns', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { cachedUserModules } = await import('@/lib/cache')
      const fetchFn = vi.fn().mockResolvedValue([])

      const result = await cachedUserModules('user-789', fetchFn)

      expect(result).toEqual([])
    })
  })

  describe('invalidateUserCache', () => {
    it('should not throw when Redis is not configured', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { invalidateUserCache } = await import('@/lib/cache')

      // Should complete without throwing
      await expect(invalidateUserCache('user-123')).resolves.toBeUndefined()
    })
  })

  describe('cacheDeletePattern', () => {
    it('should return false when Redis is not configured', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { cacheDeletePattern } = await import('@/lib/cache')
      const result = await cacheDeletePattern('cache:admin:*')
      expect(result).toBe(false)
    })
  })

  describe('cachedUserProfile', () => {
    it('should call fetchFn when Redis not configured', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { cachedUserProfile } = await import('@/lib/cache')
      const profile = { id: 'user-123', name: 'Test User', role: 'member' }
      const fetchFn = vi.fn().mockResolvedValue(profile)

      const result = await cachedUserProfile('user-123', fetchFn)

      expect(fetchFn).toHaveBeenCalled()
      expect(result).toEqual(profile)
    })

    it('should return null when fetchFn returns null', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { cachedUserProfile } = await import('@/lib/cache')
      const fetchFn = vi.fn().mockResolvedValue(null)

      const result = await cachedUserProfile('user-123', fetchFn)

      expect(result).toBeNull()
    })
  })

  describe('cachedThemes', () => {
    it('should call fetchFn when Redis not configured', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { cachedThemes } = await import('@/lib/cache')
      const themes = [{ slug: 'theme1', name: 'Theme 1' }, { slug: 'theme2', name: 'Theme 2' }]
      const fetchFn = vi.fn().mockResolvedValue(themes)

      const result = await cachedThemes(fetchFn)

      expect(fetchFn).toHaveBeenCalled()
      expect(result).toEqual(themes)
    })

    it('should return empty array when fetchFn returns empty', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { cachedThemes } = await import('@/lib/cache')
      const fetchFn = vi.fn().mockResolvedValue([])

      const result = await cachedThemes(fetchFn)

      expect(result).toEqual([])
    })
  })

  describe('cachedSources', () => {
    it('should call fetchFn when Redis not configured', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { cachedSources } = await import('@/lib/cache')
      const sources = [{ id: 'src1', name: 'Source 1' }]
      const fetchFn = vi.fn().mockResolvedValue(sources)

      const result = await cachedSources(fetchFn)

      expect(fetchFn).toHaveBeenCalled()
      expect(result).toEqual(sources)
    })
  })

  describe('invalidateThemesCache', () => {
    it('should not throw when Redis is not configured', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { invalidateThemesCache } = await import('@/lib/cache')

      await expect(invalidateThemesCache()).resolves.toBeUndefined()
    })
  })

  describe('invalidateSourcesCache', () => {
    it('should not throw when Redis is not configured', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { invalidateSourcesCache } = await import('@/lib/cache')

      await expect(invalidateSourcesCache()).resolves.toBeUndefined()
    })
  })

  describe('invalidateAllCache', () => {
    it('should not throw when Redis is not configured', async () => {
      process.env = { ...originalEnv }
      delete process.env.UPSTASH_REDIS_REST_URL

      const { invalidateAllCache } = await import('@/lib/cache')

      await expect(invalidateAllCache()).resolves.toBeUndefined()
    })
  })
})
