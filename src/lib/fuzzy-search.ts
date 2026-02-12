import { distance } from 'fastest-levenshtein'

/**
 * Normalize Portuguese text for fuzzy matching
 * Removes accents, converts to lowercase, handles common transliterations
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose accents
    .replace(/[\u0300-\u036f]/g, '') // Remove combining marks
    .trim()
}

/**
 * Common Sanskrit/Hindi transliteration variations in Portuguese
 * Maps common spelling variations to canonical form
 */
const TRANSLITERATION_MAP: Record<string, string[]> = {
  // Antaryamin variations (the Inner Witness/God within)
  // Forma correta nos documentos: "Antaryamin" (sem "th")
  'antaryamin': [
    // Com "th" (erro de digitação comum)
    'antharyamin', 'antharya', 'antaryamin',
    // Variações de digitação
    'antaaryamin', 'antaryamim', 'antaryami', 'antarya',
    // Com acento
    'antaryamín', 'antaryamim',
    // Abreviações
    'antaria', 'antarya', 'antaryam',
    // Erros fonéticos
    'antaramin', 'antaryamen', 'antaramim'
  ],

  // Add more common variations as needed
  'deeksha': ['diksha', 'deeksha', 'deeeksha'],
  'atman': ['atma', 'aatman', 'atman'],
  'brahman': ['brahma', 'brahmam', 'brahman'],
  'maya': ['maia', 'mya', 'maya'],
  'karma': ['carma', 'karma'],
  'dharma': ['darma', 'dharmma', 'dharma'],
  'bhagavan': ['bagavan', 'bhagawan', 'bhagavan'],
  'samsara': ['samsaar', 'samsara'],
  'nirvana': ['nirvaan', 'nirvana', 'nirwana'],
  'mantra': ['mantar', 'montra', 'mantra'],
  'chakra': ['chacra', 'chakra', 'chakara'],
  'kundalini': ['kundaline', 'kundalini', 'kundalinee'],
  'prana': ['prana', 'praan', 'pranna'],
  'asana': ['assan', 'asana', 'aasan'],
  'ashram': ['ashrama', 'ashram', 'asram'],
}

/**
 * Get canonical form of a word (for fuzzy matching)
 */
function getCanonicalForm(word: string): string {
  const normalized = normalizeText(word)

  for (const [canonical, variations] of Object.entries(TRANSLITERATION_MAP)) {
    if (canonical === normalized || variations.includes(normalized)) {
      return canonical
    }
  }

  return normalized
}

/**
 * Calculate fuzzy match score between two strings
 * Returns a score between 0 and 1 (1 = perfect match)
 */
export function calculateFuzzyScore(source: string, target: string): number {
  const normalizedSource = normalizeText(source)
  const normalizedTarget = normalizeText(target)

  // Exact match
  if (normalizedSource === normalizedTarget) {
    return 1.0
  }

  // Canonical form match
  if (getCanonicalForm(normalizedSource) === getCanonicalForm(normalizedTarget)) {
    return 0.95
  }

  // If one is contained in the other
  if (normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)) {
    return 0.85
  }

  // Levenshtein distance
  const maxLen = Math.max(normalizedSource.length, normalizedTarget.length)
  const dist = distance(normalizedSource, normalizedTarget)
  const similarity = 1 - dist / maxLen

  return Math.max(0, similarity)
}

/**
 * Find fuzzy matches in an array of strings
 * Returns matches sorted by score (highest first)
 */
export function fuzzyFind(
  query: string,
  candidates: string[],
  minScore: number = 0.6
): Array<{ text: string; score: number }> {
  const results = candidates
    .map(candidate => ({
      text: candidate,
      score: calculateFuzzyScore(query, candidate)
    }))
    .filter(result => result.score >= minScore)
    .sort((a, b) => b.score - a.score)

  return results
}

/**
 * Extract keywords from text and find fuzzy matches in content
 */
export function findFuzzyKeywordsInContent(
  query: string,
  content: string,
  minScore: number = 0.7
): Array<{ keyword: string; context: string; score: number }> {
  // Extract words from query
  const queryWords = query
    .split(/\s+/)
    .filter(word => word.length > 2)
    .map(word => normalizeText(word))

  // Extract sentences/chunks from content
  const contentChunks = content
    .split(/[.!?;\n]+/)
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0)

  const results: Array<{ keyword: string; context: string; score: number }> = []

  // For each query word, find fuzzy matches in content
  for (const queryWord of queryWords) {
    // Extract words from each content chunk
    for (const chunk of contentChunks) {
      const contentWords = chunk
        .split(/\s+/)
        .map(word => normalizeText(word))

      for (const contentWord of contentWords) {
        const score = calculateFuzzyScore(queryWord, contentWord)
        if (score >= minScore) {
          results.push({
            keyword: queryWord,
            context: chunk.substring(0, 150), // First 150 chars
            score
          })
        }
      }
    }
  }

  // Remove duplicates and sort by score
  const uniqueResults = Array.from(
    new Map(
      results.map(r => [r.keyword + ':' + r.context, r])
    ).values()
  ).sort((a, b) => b.score - a.score)

  return uniqueResults
}

/**
 * Suggest corrections for a misspelled word
 */
export function suggestCorrection(
  misspelled: string,
  dictionary: string[],
  maxSuggestions: number = 3
): string[] {
  return fuzzyFind(misspelled, dictionary, 0.6)
    .slice(0, maxSuggestions)
    .map(result => result.text)
}

/**
 * Improve search by creating multiple variations of the query
 * This helps find results even with minor typos
 */
export function generateSearchVariations(query: string): string[] {
  const variations = new Set<string>([query])

  // Add canonical forms
  const words = query.split(/\s+/).map(w => normalizeText(w))
  for (const word of words) {
    variations.add(getCanonicalForm(word))
  }

  // Add normalized version
  variations.add(normalizeText(query))

  return Array.from(variations)
}

/**
 * Semantic search enhancement: expand query with fuzzy matches
 * Helps catch typos in the original query
 */
export function enhanceQueryWithFuzzyMatches(
  query: string,
  dictionary: string[] | null = null
): {
  original: string
  normalized: string
  variations: string[]
  suggestions: string[]
} {
  return {
    original: query,
    normalized: normalizeText(query),
    variations: generateSearchVariations(query),
    suggestions: dictionary ? suggestCorrection(query, dictionary, 5) : []
  }
}

export interface FuzzySearchResult {
  text: string
  score: number
  isFuzzyMatch: boolean
}
