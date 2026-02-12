import {
  normalizeText,
  calculateFuzzyScore,
  fuzzyFind,
  enhanceQueryWithFuzzyMatches,
  findFuzzyKeywordsInContent
} from '../fuzzy-search'

describe('Fuzzy Search', () => {
  describe('normalizeText', () => {
    it('should remove accents', () => {
      expect(normalizeText('Antaryamín')).toBe('antaryamin')
      expect(normalizeText('São Paulo')).toBe('sao paulo')
    })

    it('should convert to lowercase', () => {
      expect(normalizeText('ANTARYAMIN')).toBe('antaryamin')
    })

    it('should trim whitespace', () => {
      expect(normalizeText('  antaryamin  ')).toBe('antaryamin')
    })
  })

  describe('calculateFuzzyScore', () => {
    it('should return 1.0 for exact matches', () => {
      expect(calculateFuzzyScore('Antaryamin', 'Antaryamin')).toBe(1.0)
    })

    it('should handle case differences', () => {
      expect(calculateFuzzyScore('ANTARYAMIN', 'antaryamin')).toBe(1.0)
    })

    it('should handle accent differences', () => {
      expect(calculateFuzzyScore('Antaryamín', 'Antaryamin')).toBe(1.0)
    })

    it('should score similar spellings high', () => {
      const score = calculateFuzzyScore('Antharyamin', 'Antaryamin')
      expect(score).toBeGreaterThan(0.8)
    })

    it('should handle substring matches', () => {
      const score = calculateFuzzyScore('tarya', 'antaryamin')
      expect(score).toBeGreaterThan(0.6)
    })

    it('should return 0 for completely different words', () => {
      const score = calculateFuzzyScore('xyz', 'abc')
      expect(score).toBeLessThan(0.3)
    })
  })

  describe('fuzzyFind', () => {
    const candidates = [
      'Antaryamin',
      'Atman',
      'Brahman',
      'Deeksha',
      'Dharma',
      'Maya'
    ]

    it('should find exact matches', () => {
      const results = fuzzyFind('Antaryamin', candidates)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].text).toBe('Antaryamin')
      expect(results[0].score).toBe(1.0)
    })

    it('should find fuzzy matches for "Antharyamin"', () => {
      const results = fuzzyFind('Antharyamin', candidates, 0.7)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].text).toBe('Antaryamin')
      expect(results[0].score).toBeGreaterThan(0.8)
    })

    it('should find matches for "deeksha" (lowercase)', () => {
      const results = fuzzyFind('deeksha', candidates)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].text).toBe('Deeksha')
    })

    it('should respect minScore threshold', () => {
      const results = fuzzyFind('xyz', candidates, 0.8)
      expect(results.length).toBe(0)
    })
  })

  describe('enhanceQueryWithFuzzyMatches', () => {
    it('should provide multiple variations for a query', () => {
      const enhanced = enhanceQueryWithFuzzyMatches('O que é Antharyamin?')
      expect(enhanced.original).toBe('O que é Antharyamin?')
      expect(enhanced.normalized).toBe('o que e antharyamin')
      expect(enhanced.variations.length).toBeGreaterThan(0)
    })

    it('should include canonical forms in variations', () => {
      const enhanced = enhanceQueryWithFuzzyMatches('Antaryamin')
      expect(enhanced.variations).toContain('antaryamin')
    })
  })

  describe('findFuzzyKeywordsInContent', () => {
    const content = `
      Antaryamin é o Deus Interno, aquele que habita em todos os seres.
      Ele é a testemunha silenciosa de nossas ações e pensamentos.
      O Antaryamin guia todos os seres em sua jornada espiritual.
    `

    it('should find fuzzy matches in content', () => {
      const results = findFuzzyKeywordsInContent('Antharyamin', content, 0.65)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should return context snippets', () => {
      const results = findFuzzyKeywordsInContent('Antaryamin', content, 0.7)
      if (results.length > 0) {
        expect(results[0].context.length).toBeGreaterThan(0)
      }
    })

    it('should handle typos in keywords', () => {
      const results = findFuzzyKeywordsInContent('espiritual', content, 0.6)
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Antaryamin variations (all spellings)', () => {
    const antaryaminVariations = [
      'Antaryamin',      // Forma correta (sem "th")
      'Antharyamin',     // Com "th" (erro comum)
      'antaryamin',      // Minúscula
      'ANTARYAMIN',      // Maiúscula
      'Antaryamín',      // Com acento
      'antaaryamin',     // Dobro 'aa'
      'antaryamim',      // Final em 'm'
      'antaryami',       // Forma abreviada
      'antarya',         // Abreviação
      'antaria',         // Variação
      'antaramin',       // Variação fonética
      'antaryamen',      // Variação
      'antaramim'        // Variação
    ]

    it('should find exact match for "Antaryamin"', () => {
      const score = calculateFuzzyScore('Antaryamin', 'Antaryamin')
      expect(score).toBe(1.0)
    })

    it('should find "Antharyamin" (with th) as canonical match', () => {
      const score = calculateFuzzyScore('Antharyamin', 'Antaryamin')
      expect(score).toBeGreaterThan(0.8)
    })

    it('should find all variations with high score', () => {
      antaryaminVariations.forEach(variation => {
        const score = calculateFuzzyScore(variation, 'Antaryamin')
        expect(score).toBeGreaterThan(0.6)
      })
    })

    it('should handle query "O que é Antharyamin?"', () => {
      const enhanced = enhanceQueryWithFuzzyMatches('O que é Antharyamin?')
      expect(enhanced.original).toBe('O que é Antharyamin?')
      expect(enhanced.normalized).toBe('o que e antharyamin')
      expect(enhanced.variations.length).toBeGreaterThan(0)
    })

    it('should find "Antaryamin" when user searches for "Antharyamin"', () => {
      const results = fuzzyFind('Antharyamin', antaryaminVariations, 0.7)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].text).toBe('Antaryamin') // Should match the correct form first
    })

    it('should work in real content search', () => {
      const content = `
        Antaryamin é a Testemunha Interior, o Deus que habita dentro de todos os seres.
        Segundo os ensinamentos de Sri Amma Bhagavan, compreender o Antaryamin é fundamental.
        O poder do Antaryamin nos guia através de todas as experiências da vida.
      `
      const results = findFuzzyKeywordsInContent('Antharyamin', content, 0.6)
      expect(results.length).toBeGreaterThan(0)
    })
  })
})
