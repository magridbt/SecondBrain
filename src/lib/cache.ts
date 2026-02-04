import { Redis } from '@upstash/redis'

// Create Redis client (singleton pattern)
let redis: Redis | null = null

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }

  return redis
}

// Cache key prefixes
const CACHE_PREFIX = {
  ADMIN_CHECK: 'cache:admin:',
  USER_MODULES: 'cache:modules:',
  USER_PROFILE: 'cache:profile:',
  THEMES: 'cache:themes',
  SOURCES: 'cache:sources',
}

// Cache TTL values in seconds
const CACHE_TTL = {
  ADMIN_CHECK: 300, // 5 minutes
  USER_MODULES: 300, // 5 minutes
  USER_PROFILE: 300, // 5 minutes
  THEMES: 600, // 10 minutes
  SOURCES: 600, // 10 minutes
}

/**
 * Generic cache get function
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient()
    if (!client) return null

    const cached = await client.get<T>(key)
    return cached
  } catch (error) {
    console.warn('Cache get error:', error)
    return null
  }
}

/**
 * Generic cache set function
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<boolean> {
  try {
    const client = getRedisClient()
    if (!client) return false

    await client.set(key, value, { ex: ttlSeconds })
    return true
  } catch (error) {
    console.warn('Cache set error:', error)
    return false
  }
}

/**
 * Delete a cache key
 */
export async function cacheDelete(key: string): Promise<boolean> {
  try {
    const client = getRedisClient()
    if (!client) return false

    await client.del(key)
    return true
  } catch (error) {
    console.warn('Cache delete error:', error)
    return false
  }
}

/**
 * Delete multiple cache keys by pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<boolean> {
  try {
    const client = getRedisClient()
    if (!client) return false

    // Get all keys matching pattern
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(...keys)
    }
    return true
  } catch (error) {
    console.warn('Cache delete pattern error:', error)
    return false
  }
}

// ============================================================================
// Specific cached functions
// ============================================================================

/**
 * Cached admin check - caches whether a user is an admin for 5 minutes
 */
export async function cachedIsAdmin(
  userId: string,
  fetchFn: () => Promise<boolean>
): Promise<boolean> {
  const cacheKey = `${CACHE_PREFIX.ADMIN_CHECK}${userId}`

  // Try cache first
  const cached = await cacheGet<boolean>(cacheKey)
  if (cached !== null) {
    return cached
  }

  // Fetch and cache
  const isAdmin = await fetchFn()
  await cacheSet(cacheKey, isAdmin, CACHE_TTL.ADMIN_CHECK)

  return isAdmin
}

/**
 * Cached user modules - caches user's module access for 5 minutes
 */
export async function cachedUserModules(
  userId: string,
  fetchFn: () => Promise<string[]>
): Promise<string[]> {
  const cacheKey = `${CACHE_PREFIX.USER_MODULES}${userId}`

  // Try cache first
  const cached = await cacheGet<string[]>(cacheKey)
  if (cached !== null) {
    return cached
  }

  // Fetch and cache
  const modules = await fetchFn()
  await cacheSet(cacheKey, modules, CACHE_TTL.USER_MODULES)

  return modules
}

/**
 * Cached user profile - caches user profile data for 5 minutes
 */
export async function cachedUserProfile<T>(
  userId: string,
  fetchFn: () => Promise<T | null>
): Promise<T | null> {
  const cacheKey = `${CACHE_PREFIX.USER_PROFILE}${userId}`

  // Try cache first
  const cached = await cacheGet<T>(cacheKey)
  if (cached !== null) {
    return cached
  }

  // Fetch and cache
  const profile = await fetchFn()
  if (profile) {
    await cacheSet(cacheKey, profile, CACHE_TTL.USER_PROFILE)
  }

  return profile
}

/**
 * Cached themes list - caches available themes for 10 minutes
 */
export async function cachedThemes<T>(
  fetchFn: () => Promise<T[]>
): Promise<T[]> {
  const cacheKey = CACHE_PREFIX.THEMES

  // Try cache first
  const cached = await cacheGet<T[]>(cacheKey)
  if (cached !== null) {
    return cached
  }

  // Fetch and cache
  const themes = await fetchFn()
  await cacheSet(cacheKey, themes, CACHE_TTL.THEMES)

  return themes
}

/**
 * Cached sources list - caches teaching sources for 10 minutes
 */
export async function cachedSources<T>(
  fetchFn: () => Promise<T[]>
): Promise<T[]> {
  const cacheKey = CACHE_PREFIX.SOURCES

  // Try cache first
  const cached = await cacheGet<T[]>(cacheKey)
  if (cached !== null) {
    return cached
  }

  // Fetch and cache
  const sources = await fetchFn()
  await cacheSet(cacheKey, sources, CACHE_TTL.SOURCES)

  return sources
}

// ============================================================================
// Cache invalidation functions
// ============================================================================

/**
 * Invalidate all cache for a specific user
 * Call this when user role or module access changes
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await Promise.all([
    cacheDelete(`${CACHE_PREFIX.ADMIN_CHECK}${userId}`),
    cacheDelete(`${CACHE_PREFIX.USER_MODULES}${userId}`),
    cacheDelete(`${CACHE_PREFIX.USER_PROFILE}${userId}`),
  ])
}

/**
 * Invalidate themes cache
 * Call this when themes are added/modified
 */
export async function invalidateThemesCache(): Promise<void> {
  await cacheDelete(CACHE_PREFIX.THEMES)
}

/**
 * Invalidate sources cache
 * Call this when sources are added/modified
 */
export async function invalidateSourcesCache(): Promise<void> {
  await cacheDelete(CACHE_PREFIX.SOURCES)
}

/**
 * Invalidate all caches (use sparingly)
 */
export async function invalidateAllCache(): Promise<void> {
  await Promise.all([
    cacheDeletePattern(`${CACHE_PREFIX.ADMIN_CHECK}*`),
    cacheDeletePattern(`${CACHE_PREFIX.USER_MODULES}*`),
    cacheDeletePattern(`${CACHE_PREFIX.USER_PROFILE}*`),
    cacheDelete(CACHE_PREFIX.THEMES),
    cacheDelete(CACHE_PREFIX.SOURCES),
  ])
}
