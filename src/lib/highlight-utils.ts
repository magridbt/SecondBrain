// Helper function to highlight search keywords in text (exact word matching only)
// Analyzes all question types in Portuguese: O que, Como, Por que, Quando, Onde, Quem, Quanto
export function highlightKeywords(text: string, keywords: string): string {
  if (!keywords || keywords.length === 0) {
    return text
  }

  // Comprehensive Portuguese stopwords covering all question types
  // Includes: articles, prepositions, auxiliary verbs, pronouns, conjunctions, interrogatives
  const stopwords = new Set([
    // Interrogative Pronouns & Adverbs (question starters - always remove)
    'que', 'qual', 'quais', 'quem', 'quanto', 'quanta', 'quantos', 'quantas',
    'quando', 'onde', 'como', 'por', 'porque', 'porquê',

    // Articles (definite & indefinite)
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',

    // Prepositions (most common)
    'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
    'ao', 'aos', 'à', 'às', 'sobre', 'sob', 'entre', 'ante', 'após',
    'sem', 'com', 'pelo', 'pela', 'pelos', 'pelas', 'para', 'até',
    'desde', 'durante', 'perante', 'mediante', 'consoante',

    // Auxiliary & Linking Verbs (ser, estar, ter, haver)
    'é', 'são', 'era', 'eram', 'fui', 'foi', 'foram', 'és', 'sois', 'sendo', 'sido',
    'está', 'estão', 'estava', 'estavam', 'estou', 'estás', 'estamos', 'estais',
    'tem', 'temos', 'tinha', 'tinham', 'tenho', 'tens', 'tivemos', 'teve', 'tiveram',
    'há', 'havia', 'houve', 'houveram', 'haja', 'houvesse',
    'ser', 'estar', 'ter', 'haver',

    // Conjunctions & Connectors
    'e', 'ou', 'mas', 'porém', 'contudo', 'todavia', 'entretanto', 'senão',
    'se', 'caso', 'nem', 'quer', 'embora', 'conquanto', 'ainda', 'já',
    'assim', 'portanto', 'logo', 'pois', 'porque', 'que', 'donde',

    // Adverbs (non-interrogative)
    'não', 'sim', 'nunca', 'jamais', 'sempre', 'talvez', 'aqui', 'ali', 'acolá',
    'cá', 'lá', 'perto', 'longe', 'antes', 'depois', 'hoje', 'ontem', 'amanhã',
    'ainda', 'já', 'logo', 'cedo', 'tarde', 'bem', 'mal', 'melhor', 'pior',
    'bastante', 'muito', 'pouco', 'menos', 'mais', 'menos', 'apenas', 'quase',

    // Common Pronouns & Determiners
    'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas', 'você',
    'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes', 'meu', 'teu', 'seu',
    'minha', 'tua', 'sua', 'nosso', 'vosso', 'dele', 'dela', 'deles', 'delas',
    'este', 'esse', 'aquele', 'esta', 'essa', 'aquela', 'isto', 'isso', 'aquilo',
    'nenhum', 'nenhuma', 'ninguém', 'algum', 'alguma', 'alguém', 'todo', 'toda',
    'todos', 'todas', 'outro', 'outra', 'outros', 'outras', 'certo', 'certa',
    'uns', 'umas',

    // Question markers & filler words
    'né', 'tá', 'viu', 'sabe', 'olha', 'ó', 'ó', 'al', 'ai',
  ])

  // Extract important keywords (remove stopwords, keep only meaningful words)
  const keywordList = keywords
    .toLowerCase()
    .split(/[\s,?.!;:\-]+/)
    .filter(word => {
      // Keep only words with meaningful content
      // Exclude: very short words, pure numbers, stopwords
      return (
        word.length > 3 &&
        !stopwords.has(word) &&
        !/^\d+$/.test(word) // Exclude numbers
      )
    })
    .slice(0, 5) // Allow up to 5 keywords for complex queries

  if (keywordList.length === 0) {
    return text
  }

  // Create regex pattern with word boundaries to match WHOLE WORDS ONLY
  // Case-insensitive matching
  const pattern = new RegExp(`\\b(${keywordList.join('|')})\\b`, 'gi')

  return text.replace(pattern, (match) => {
    return `<mark style="background-color: #fcd34d; color: #000; padding: 2px 4px; border-radius: 3px; font-weight: 500;">${match}</mark>`
  })
}
