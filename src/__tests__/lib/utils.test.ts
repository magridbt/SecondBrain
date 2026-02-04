import { describe, it, expect } from 'vitest'
import { cn, formatDate, truncate } from '@/lib/utils'

describe('utils', () => {
  describe('cn (classnames)', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('should handle undefined and null values', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
    })

    it('should merge Tailwind classes correctly', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2')
    })

    it('should handle arrays of classes', () => {
      expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
    })

    it('should handle objects with boolean values', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
    })

    it('should merge conflicting Tailwind utilities', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('should preserve non-conflicting utilities', () => {
      expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500')
    })
  })

  describe('formatDate', () => {
    it('should format date string', () => {
      const formatted = formatDate('2026-01-23')
      expect(formatted).toContain('jan')
      expect(formatted).toContain('2026')
    })

    it('should format Date object', () => {
      const date = new Date('2026-06-15')
      const formatted = formatDate(date)
      expect(formatted).toContain('jun')
      expect(formatted).toContain('2026')
    })

    it('should use pt-BR locale', () => {
      const formatted = formatDate('2026-03-10')
      // Brazilian Portuguese uses lowercase month abbreviations
      expect(formatted.toLowerCase()).toContain('mar')
    })

    it('should include day with 2 digits', () => {
      // Use a date object to avoid timezone issues
      const date = new Date(2026, 0, 15) // January 15, 2026
      const formatted = formatDate(date)
      expect(formatted).toMatch(/15/)
    })
  })

  describe('truncate', () => {
    it('should not truncate strings shorter than length', () => {
      expect(truncate('hello', 10)).toBe('hello')
    })

    it('should not truncate strings equal to length', () => {
      expect(truncate('hello', 5)).toBe('hello')
    })

    it('should truncate strings longer than length', () => {
      expect(truncate('hello world', 5)).toBe('hello...')
    })

    it('should handle empty strings', () => {
      expect(truncate('', 10)).toBe('')
    })

    it('should truncate to exact length and add ellipsis', () => {
      expect(truncate('abcdefghij', 3)).toBe('abc...')
    })

    it('should handle length of 0', () => {
      expect(truncate('hello', 0)).toBe('...')
    })
  })
})
