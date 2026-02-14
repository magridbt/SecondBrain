// Keyword highlighting with Portuguese stemming support
// Matches word variations: sofrimento → sofr* (sofre, sofrer, sofrendo, etc.)

// Simple Portuguese stemmer - extracts root/stem of a word
function portugueseStem(word: string): string {
  let stem = word.toLowerCase()

  // Remove common Portuguese suffixes (longest first)
  const suffixes = [
    'imentos', 'imento', 'amento', 'amentos',
    'mente', 'ções', 'ção', 'idades', 'idade',
    'ável', 'ível', 'osos', 'osas', 'oso', 'osa',
    'ando', 'endo', 'indo',
    'aram', 'eram', 'iram',
    'ados', 'idas', 'idos', 'adas', 'ado', 'ido', 'ada', 'ida',
    'ante', 'ente', 'inte',
    'ores', 'oras', 'ador', 'edor', 'idor',
    'eira', 'eiro', 'eiras', 'eiros',
    'ência', 'ância', 'ências', 'âncias',
    'ismo', 'ista', 'ismos', 'istas',
    'ura', 'uras',
    'ar', 'er', 'ir',
    'ou', 'ei', 'am', 'em',
  ]

  for (const suffix of suffixes) {
    if (stem.endsWith(suffix) && stem.length - suffix.length >= 3) {
      stem = stem.slice(0, -suffix.length)
      break
    }
  }

  return stem
}

// Comprehensive Portuguese stopwords
const STOPWORDS = new Set([
  // Interrogative Pronouns & Adverbs
  'que', 'qual', 'quais', 'quem', 'quanto', 'quanta', 'quantos', 'quantas',
  'quando', 'onde', 'como', 'por', 'porque', 'porquê',
  // Articles
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  // Prepositions
  'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'ao', 'aos', 'à', 'às', 'sobre', 'sob', 'entre', 'ante', 'após',
  'sem', 'com', 'pelo', 'pela', 'pelos', 'pelas', 'para', 'até',
  'desde', 'durante', 'perante', 'mediante', 'consoante',
  // Auxiliary verbs
  'é', 'são', 'era', 'eram', 'fui', 'foi', 'foram', 'és', 'sois', 'sendo', 'sido',
  'está', 'estão', 'estava', 'estavam', 'estou', 'estás', 'estamos', 'estais',
  'tem', 'temos', 'tinha', 'tinham', 'tenho', 'tens', 'tivemos', 'teve', 'tiveram',
  'há', 'havia', 'houve', 'houveram', 'haja', 'houvesse',
  'ser', 'estar', 'ter', 'haver',
  // Conjunctions
  'e', 'ou', 'mas', 'porém', 'contudo', 'todavia', 'entretanto', 'senão',
  'se', 'caso', 'nem', 'quer', 'embora', 'conquanto', 'ainda', 'já',
  'assim', 'portanto', 'logo', 'pois', 'porque', 'que', 'donde',
  // Adverbs
  'não', 'sim', 'nunca', 'jamais', 'sempre', 'talvez', 'aqui', 'ali', 'acolá',
  'cá', 'lá', 'perto', 'longe', 'antes', 'depois', 'hoje', 'ontem', 'amanhã',
  'ainda', 'já', 'logo', 'cedo', 'tarde', 'bem', 'mal', 'melhor', 'pior',
  'bastante', 'muito', 'pouco', 'menos', 'mais', 'menos', 'apenas', 'quase',
  // Pronouns
  'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas', 'você',
  'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes', 'meu', 'teu', 'seu',
  'minha', 'tua', 'sua', 'nosso', 'vosso', 'dele', 'dela', 'deles', 'delas',
  'este', 'esse', 'aquele', 'esta', 'essa', 'aquela', 'isto', 'isso', 'aquilo',
  'nenhum', 'nenhuma', 'ninguém', 'algum', 'alguma', 'alguém', 'todo', 'toda',
  'todos', 'todas', 'outro', 'outra', 'outros', 'outras', 'certo', 'certa',
  // Filler words
  'né', 'tá', 'viu', 'sabe', 'olha', 'ó', 'al', 'ai',
])

export function highlightKeywords(text: string, keywords: string): string {
  if (!keywords || keywords.length === 0 || !text) {
    return text
  }

  // Extract meaningful keywords (remove stopwords)
  const keywordList = keywords
    .toLowerCase()
    .split(/[\s,?.!;:\-]+/)
    .filter(word => word.length >= 3 && !STOPWORDS.has(word) && !/^\d+$/.test(word))
    .slice(0, 5)

  if (keywordList.length === 0) {
    return text
  }

  // Build regex patterns: stem-based for longer words, exact for shorter
  const patterns: string[] = []

  for (const word of keywordList) {
    const stem = portugueseStem(word)

    if (stem.length >= 3) {
      // Escape special regex chars in stem
      const escapedStem = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Match any word starting with the stem (e.g., "sofr" matches "sofrimento", "sofre", "sofrer")
      patterns.push(`${escapedStem}\\w*`)
    } else {
      // For very short stems, use the original word with word boundaries
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      patterns.push(`\\b${escaped}\\b`)
    }
  }

  if (patterns.length === 0) {
    return text
  }

  // Match words using combined pattern, case-insensitive
  // Use a negative lookbehind/lookahead to avoid matching inside HTML tags
  const combinedPattern = new RegExp(
    `(?<![<\\w])(?:${patterns.join('|')})(?![\\w>])`,
    'gi'
  )

  return text.replace(combinedPattern, (match) => {
    // Don't highlight very short accidental matches (1-2 chars)
    if (match.length < 3) return match
    return `<mark style="background-color: #fcd34d; color: #000; padding: 2px 4px; border-radius: 3px; font-weight: 500;">${match}</mark>`
  })
}
