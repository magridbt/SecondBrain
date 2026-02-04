import { describe, it, expect, vi, beforeEach } from 'vitest'
import { encryptKey, decryptKey, maskKey, needsMigration, migrateKey } from '@/lib/encryption'

describe('encryption module', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('encryptKey', () => {
    it('should return empty string for empty input', () => {
      expect(encryptKey('')).toBe('')
    })

    it('should encrypt a key with aes256 prefix', () => {
      const result = encryptKey('test-api-key')
      expect(result).toMatch(/^aes256:/)
      expect(result.split(':').length).toBe(4)
    })

    it('should produce different ciphertexts for same plaintext (IV is random)', () => {
      const encrypted1 = encryptKey('same-key')
      const encrypted2 = encryptKey('same-key')
      expect(encrypted1).not.toBe(encrypted2)
    })
  })

  describe('decryptKey', () => {
    it('should return empty string for empty input', () => {
      expect(decryptKey('')).toBe('')
    })

    it('should return input as-is if not encrypted', () => {
      expect(decryptKey('plain-text')).toBe('plain-text')
    })

    it('should decrypt a properly encrypted key', () => {
      const original = 'my-secret-api-key-12345'
      const encrypted = encryptKey(original)
      const decrypted = decryptKey(encrypted)
      expect(decrypted).toBe(original)
    })

    it('should handle keys with special characters', () => {
      const original = 'sk-ant_key123!@#$%^&*()_+-=[]{}|;:,.<>?'
      const encrypted = encryptKey(original)
      const decrypted = decryptKey(encrypted)
      expect(decrypted).toBe(original)
    })

    it('should return empty string for invalid encrypted data', () => {
      expect(decryptKey('aes256:invalid:data')).toBe('')
    })
  })

  describe('maskKey', () => {
    it('should mask short keys', () => {
      expect(maskKey('short')).toBe('••••••••')
    })

    it('should mask empty keys', () => {
      expect(maskKey('')).toBe('••••••••')
    })

    it('should show first 4 and last 4 characters', () => {
      const masked = maskKey('abcd12345678efgh')
      expect(masked.startsWith('abcd')).toBe(true)
      expect(masked.endsWith('efgh')).toBe(true)
      expect(masked).toContain('••••••••••••••••••••')
    })
  })

  describe('needsMigration', () => {
    it('should return true for legacy enc: prefix', () => {
      expect(needsMigration('enc:base64encoded')).toBe(true)
    })

    it('should return false for new aes256: prefix', () => {
      expect(needsMigration('aes256:iv:tag:data')).toBe(false)
    })

    it('should return false for plain text', () => {
      expect(needsMigration('plain-key')).toBe(false)
    })
  })

  describe('roundtrip encryption', () => {
    it('should encrypt and decrypt correctly', () => {
      const testCases = [
        'simple-key',
        'sk-ant_key_with_underscores',
        'key-with-dashes-123',
        'KeyWithMixedCase123',
        'key with spaces',
        '特殊字符',
        'emoji🔑key',
      ]

      for (const original of testCases) {
        const encrypted = encryptKey(original)
        const decrypted = decryptKey(encrypted)
        expect(decrypted).toBe(original)
      }
    })
  })

  describe('migrateKey', () => {
    it('should return key as-is if not legacy format', () => {
      const modernKey = 'aes256:iv:tag:data'
      expect(migrateKey(modernKey)).toBe(modernKey)
    })

    it('should return key as-is if plain text', () => {
      const plainKey = 'plain-api-key'
      expect(migrateKey(plainKey)).toBe(plainKey)
    })

    it('should return empty string for invalid legacy key', () => {
      const invalidLegacy = 'enc:invalidbase64data'
      const result = migrateKey(invalidLegacy)
      // Should return empty string since decryption fails
      expect(result).toBe('')
    })
  })

  describe('decryptKey edge cases', () => {
    it('should handle malformed aes256 data gracefully', () => {
      expect(decryptKey('aes256:a:b:c:d:e')).toBe('') // too many parts
      expect(decryptKey('aes256:')).toBe('') // missing parts
      expect(decryptKey('aes256:invalid-base64:tag:data')).toBe('')
    })

    it('should return plain text for non-encrypted strings', () => {
      expect(decryptKey('sk-ant-api-key')).toBe('sk-ant-api-key')
      expect(decryptKey('openai-key-123')).toBe('openai-key-123')
    })
  })

  describe('maskKey edge cases', () => {
    it('should handle null/undefined gracefully', () => {
      expect(maskKey(null as unknown as string)).toBe('••••••••')
      expect(maskKey(undefined as unknown as string)).toBe('••••••••')
    })

    it('should handle exact 8 character keys', () => {
      const result = maskKey('12345678')
      expect(result.startsWith('1234')).toBe(true)
      expect(result.endsWith('5678')).toBe(true)
    })
  })
})
