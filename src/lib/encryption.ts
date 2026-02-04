import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

// Get encryption key from environment
// SECURITY: No fallback in production - key MUST be set
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY

  // In production, ENCRYPTION_KEY is required
  if (process.env.NODE_ENV === 'production') {
    if (!envKey || envKey === 'default-key-change-in-production') {
      throw new Error(
        'CRITICAL SECURITY ERROR: ENCRYPTION_KEY environment variable is not set or using default value. ' +
        'Set a secure 32+ character key in production.'
      )
    }
  }

  // In development, allow a fallback with clear warning
  if (!envKey || envKey === 'default-key-change-in-production') {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '\x1b[33m%s\x1b[0m',
        'WARNING: Using development fallback encryption key. ' +
        'Set ENCRYPTION_KEY in environment for production.'
      )
    }
    // Use a deterministic fallback for development only
    return crypto.scryptSync('dev-fallback-key-NEVER-USE-IN-PROD', 'dev-salt', 32)
  }

  // Validate key length
  if (envKey.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY must be at least 32 characters long for security. ' +
      `Current length: ${envKey.length}`
    )
  }

  // Derive a proper 32-byte key from the environment variable
  return crypto.scryptSync(envKey, 'aios-salt-v1', 32)
}

/**
 * Encrypt a string using AES-256-GCM
 * Format: aes256:iv:authTag:encryptedData (all base64)
 */
export function encryptKey(plaintext: string): string {
  if (!plaintext) return ''

  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    // Format: prefix:iv:authTag:encrypted
    return `aes256:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 */
export function decryptKey(encryptedData: string): string {
  if (!encryptedData) return ''

  // Handle legacy base64 encoded keys (enc: prefix)
  if (encryptedData.startsWith('enc:')) {
    return decryptLegacyKey(encryptedData)
  }

  // Handle new AES-256-GCM format
  if (!encryptedData.startsWith('aes256:')) {
    return encryptedData // Return as-is if not encrypted
  }

  try {
    const key = getEncryptionKey()
    const parts = encryptedData.split(':')

    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format')
    }

    const [, ivBase64, authTagBase64, encrypted] = parts
    const iv = Buffer.from(ivBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    return ''
  }
}

/**
 * Decrypt legacy keys (base64 encoded with enc: prefix)
 * This provides backwards compatibility during migration
 */
function decryptLegacyKey(encryptedKey: string): string {
  if (!encryptedKey.startsWith('enc:')) return encryptedKey

  try {
    const envKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
    const encoded = encryptedKey.slice(4)
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
    const [prefix, ...keyParts] = decoded.split(':')

    if (prefix === envKey) {
      return keyParts.join(':')
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * Mask an API key for display
 */
export function maskKey(key: string): string {
  if (!key || key.length < 8) return '••••••••'
  return `${key.slice(0, 4)}${'•'.repeat(20)}${key.slice(-4)}`
}

/**
 * Check if a key needs migration from legacy format
 */
export function needsMigration(encryptedKey: string): boolean {
  return encryptedKey.startsWith('enc:')
}

/**
 * Migrate a legacy key to new format
 */
export function migrateKey(encryptedKey: string): string {
  if (!needsMigration(encryptedKey)) return encryptedKey

  const decrypted = decryptLegacyKey(encryptedKey)
  if (!decrypted) return ''

  return encryptKey(decrypted)
}
