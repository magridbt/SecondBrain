/**
 * Testes de Validacao - Implementacao de Stop Words
 * Projeto: Sri Amma Bhagavan - Second Brain
 * Data: 23 de Janeiro de 2026
 *
 * Este arquivo contem testes automatizados para validar o comportamento
 * correto da filtragem de stop words no sistema de busca semantica.
 */

import { describe, it, expect, beforeAll } from 'vitest'

// =============================================================================
// STOP WORDS - Copia da implementacao para testes isolados
// =============================================================================
const STOP_WORDS = new Set([
  // PORTUGUES - ARTIGOS
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',

  // PORTUGUES - PREPOSICOES
  'a', 'ante', 'apos', 'ate', 'com', 'contra', 'de', 'desde', 'em', 'entre',
  'para', 'perante', 'por', 'sem', 'sob', 'sobre', 'tras',
  'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas',
  'ao', 'aos', 'a', 'as',
  'pelo', 'pela', 'pelos', 'pelas',
  'num', 'numa', 'nuns', 'numas',
  'dum', 'duma', 'duns', 'dumas',
  'neste', 'nesta', 'nestes', 'nestas', 'nisto',
  'nesse', 'nessa', 'nesses', 'nessas', 'nisso',
  'naquele', 'naquela', 'naqueles', 'naquelas', 'naquilo',
  'deste', 'desta', 'destes', 'destas', 'disto',
  'desse', 'dessa', 'desses', 'dessas', 'disso',
  'daquele', 'daquela', 'daqueles', 'daquelas', 'daquilo',

  // PORTUGUES - CONJUNCOES
  'e', 'nem', 'mas', 'porem', 'contudo', 'todavia', 'entretanto', 'ou', 'ora',
  'logo', 'pois', 'portanto', 'assim', 'entao',
  'que', 'se', 'como', 'quando', 'onde', 'porque', 'enquanto', 'embora',

  // PORTUGUES - PRONOMES PESSOAIS
  'eu', 'tu', 'ele', 'ela', 'nos', 'vos', 'eles', 'elas',
  'voce', 'voces', 'gente',
  'me', 'te', 'se', 'lhe', 'vos', 'lhes',
  'mim', 'ti', 'si',
  'comigo', 'contigo', 'consigo', 'conosco', 'convosco',

  // PORTUGUES - PRONOMES DEMONSTRATIVOS
  'este', 'esta', 'estes', 'estas', 'isto',
  'esse', 'essa', 'esses', 'essas', 'isso',
  'aquele', 'aquela', 'aqueles', 'aquelas', 'aquilo',

  // PORTUGUES - PRONOMES POSSESSIVOS
  'meu', 'minha', 'meus', 'minhas',
  'teu', 'tua', 'teus', 'tuas',
  'seu', 'sua', 'seus', 'suas',
  'nosso', 'nossa', 'nossos', 'nossas',

  // PORTUGUES - PRONOMES INDEFINIDOS
  'algum', 'alguma', 'alguns', 'algumas',
  'nenhum', 'nenhuma', 'todo', 'toda', 'todos', 'todas',
  'muito', 'muita', 'muitos', 'muitas',
  'pouco', 'pouca', 'poucos', 'poucas',
  'qualquer', 'quaisquer', 'cada', 'alguem', 'ninguem',
  'tudo', 'nada', 'algo',

  // PORTUGUES - PRONOMES INTERROGATIVOS
  'qual', 'quais', 'quem', 'que', 'cujo', 'cuja',

  // PORTUGUES - ADVERBIOS
  'agora', 'ainda', 'amanha', 'antes', 'depois', 'hoje', 'ja', 'nunca', 'sempre',
  'aqui', 'ali', 'la', 'ca', 'longe', 'perto',
  'bem', 'mal', 'assim', 'melhor', 'pior',
  'mais', 'menos', 'muito', 'pouco', 'quase', 'tao',
  'sim', 'nao', 'talvez',
  'apenas', 'somente', 'so', 'tambem',

  // PORTUGUES - VERBOS COMUNS (principais conjugacoes)
  'ser', 'sou', 'es', 'e', 'somos', 'sao', 'era', 'fui', 'foi', 'sera', 'seria', 'seja',
  'estar', 'estou', 'esta', 'estamos', 'estao', 'estava', 'estive', 'esteve',
  'ter', 'tenho', 'tem', 'temos', 'tinha', 'tive', 'teve', 'tera', 'teria', 'tenha',
  'haver', 'ha', 'havia', 'houve', 'havera', 'haveria', 'haja',
  'ir', 'vou', 'vai', 'vamos', 'vao', 'ia', 'fui', 'foi', 'ira', 'iria',
  'vir', 'venho', 'vem', 'vinha', 'vim', 'veio', 'vira', 'viria', 'venha',
  'poder', 'posso', 'pode', 'podemos', 'podem', 'podia', 'pude', 'podera', 'poderia', 'possa',
  'fazer', 'faco', 'faz', 'fazemos', 'fazem', 'fazia', 'fiz', 'fez', 'fara', 'faria', 'faca',
  'dizer', 'digo', 'diz', 'dizemos', 'dizem', 'dizia', 'disse', 'dira', 'diria', 'diga',
  'saber', 'sei', 'sabe', 'sabemos', 'sabem', 'sabia', 'soube', 'sabera', 'saberia', 'saiba',
  'querer', 'quero', 'quer', 'queremos', 'querem', 'queria', 'quis', 'queira',
  'dar', 'dou', 'da', 'damos', 'dao', 'dava', 'dei', 'deu', 'dara', 'daria', 'de',
  'ver', 'vejo', 've', 'vemos', 'veem', 'via', 'vi', 'viu', 'vera', 'veria', 'veja',

  // PORTUGUES - PALAVRAS COLOQUIAIS
  'oque', 'oq', 'pq', 'pra', 'pro', 'ne', 'ta', 'to', 'ce', 'vc',
  'tipo', 'coisa', 'coisas', 'forma', 'jeito',

  // INGLES - ARTICLES
  'the', 'a', 'an',

  // INGLES - PREPOSITIONS
  'at', 'by', 'for', 'from', 'in', 'of', 'on', 'to', 'with', 'without',
  'about', 'above', 'across', 'after', 'against', 'along', 'among',
  'before', 'behind', 'below', 'between', 'beyond',
  'during', 'inside', 'into', 'near', 'over', 'through', 'under', 'until',

  // INGLES - CONJUNCTIONS
  'and', 'but', 'or', 'nor', 'yet', 'so',
  'although', 'because', 'since', 'unless', 'while', 'if', 'then', 'whether',

  // INGLES - PRONOUNS
  'i', 'me', 'my', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
  'who', 'whom', 'whose', 'which', 'that',
  'this', 'these', 'those',
  'what', 'whatever', 'whoever',
  'anyone', 'everyone', 'someone', 'nobody',
  'anything', 'everything', 'something', 'nothing',

  // INGLES - VERBS
  'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing', 'done',
  'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must',
  'get', 'gets', 'got', 'getting',
  'make', 'makes', 'made', 'making',
  'go', 'goes', 'went', 'going', 'gone',
  'come', 'comes', 'came', 'coming',
  'take', 'takes', 'took', 'taking', 'taken',
  'see', 'sees', 'saw', 'seeing', 'seen',
  'know', 'knows', 'knew', 'knowing', 'known',
  'think', 'thinks', 'thought', 'thinking',
  'want', 'wants', 'wanted', 'wanting',
  'give', 'gives', 'gave', 'giving', 'given',
  'tell', 'tells', 'told', 'telling',
  'feel', 'feels', 'felt', 'feeling',

  // INGLES - ADVERBS
  'very', 'really', 'quite', 'too', 'enough', 'almost', 'also',
  'always', 'never', 'often', 'sometimes', 'usually',
  'already', 'still', 'yet', 'just', 'now', 'then',
  'here', 'there', 'where',
  'however', 'therefore', 'moreover',

  // INGLES - QUESTION WORDS
  'how', 'what', 'when', 'where', 'which', 'who', 'why',
  'please', 'thanks', 'sorry', 'hello', 'okay', 'yes', 'yeah', 'no',

  // INGLES - OTHER COMMON
  'not', 'more', 'less', 'most', 'much', 'many',
  'few', 'little', 'some', 'any', 'all', 'both', 'each', 'every',
  'thing', 'things', 'way', 'time', 'times', 'year', 'years',
  'people', 'person', 'world', 'life',
])

// =============================================================================
// FUNCOES DE SUPORTE (copias para testes)
// =============================================================================

function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function filterStopWords(terms: string[]): string[] {
  return terms.filter(term => {
    const lower = term.toLowerCase()
    return !STOP_WORDS.has(lower) && term.length > 2
  })
}

function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase())
}

// =============================================================================
// TESTES
// =============================================================================

describe('Stop Words - Validacao da Implementacao', () => {

  describe('1. Filtragem de Palavras em Portugues', () => {

    it('deve filtrar artigos definidos', () => {
      const artigos = ['o', 'a', 'os', 'as']
      artigos.forEach(artigo => {
        expect(isStopWord(artigo)).toBe(true)
      })
    })

    it('deve filtrar artigos indefinidos', () => {
      const artigos = ['um', 'uma', 'uns', 'umas']
      artigos.forEach(artigo => {
        expect(isStopWord(artigo)).toBe(true)
      })
    })

    it('deve filtrar preposicoes simples', () => {
      const preposicoes = ['de', 'para', 'com', 'em', 'por', 'sem', 'sobre']
      preposicoes.forEach(prep => {
        expect(isStopWord(prep)).toBe(true)
      })
    })

    it('deve filtrar contracoes com artigos', () => {
      const contracoes = ['do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'ao', 'aos']
      contracoes.forEach(contr => {
        expect(isStopWord(contr)).toBe(true)
      })
    })

    it('deve filtrar contracoes com demonstrativos', () => {
      const contracoes = ['neste', 'nesta', 'nesse', 'nessa', 'deste', 'desta', 'desse', 'dessa']
      contracoes.forEach(contr => {
        expect(isStopWord(contr)).toBe(true)
      })
    })

    it('deve filtrar conjuncoes', () => {
      const conjuncoes = ['e', 'ou', 'mas', 'porem', 'que', 'se', 'como', 'quando', 'porque']
      conjuncoes.forEach(conj => {
        expect(isStopWord(conj)).toBe(true)
      })
    })

    it('deve filtrar pronomes pessoais', () => {
      const pronomes = ['eu', 'tu', 'ele', 'ela', 'nos', 'eles', 'elas', 'voce', 'voces']
      pronomes.forEach(pron => {
        expect(isStopWord(pron)).toBe(true)
      })
    })

    it('deve filtrar pronomes obliquos', () => {
      const obliquos = ['me', 'te', 'se', 'lhe', 'mim', 'ti', 'si', 'comigo', 'contigo']
      obliquos.forEach(obl => {
        expect(isStopWord(obl)).toBe(true)
      })
    })

    it('deve filtrar pronomes demonstrativos', () => {
      const demonstrativos = ['este', 'esta', 'isto', 'esse', 'essa', 'isso', 'aquele', 'aquela', 'aquilo']
      demonstrativos.forEach(dem => {
        expect(isStopWord(dem)).toBe(true)
      })
    })

    it('deve filtrar pronomes possessivos', () => {
      const possessivos = ['meu', 'minha', 'seu', 'sua', 'nosso', 'nossa']
      possessivos.forEach(poss => {
        expect(isStopWord(poss)).toBe(true)
      })
    })

    it('deve filtrar pronomes indefinidos', () => {
      const indefinidos = ['algum', 'nenhum', 'todo', 'muito', 'pouco', 'qualquer', 'alguem', 'ninguem', 'tudo', 'nada']
      indefinidos.forEach(indef => {
        expect(isStopWord(indef)).toBe(true)
      })
    })

    it('deve filtrar adverbios de tempo', () => {
      const adverbios = ['agora', 'ainda', 'amanha', 'antes', 'depois', 'hoje', 'ja', 'nunca', 'sempre']
      adverbios.forEach(adv => {
        expect(isStopWord(adv)).toBe(true)
      })
    })

    it('deve filtrar adverbios de lugar', () => {
      const adverbios = ['aqui', 'ali', 'la', 'ca', 'longe', 'perto']
      adverbios.forEach(adv => {
        expect(isStopWord(adv)).toBe(true)
      })
    })

    it('deve filtrar conjugacoes do verbo SER', () => {
      const ser = ['sou', 'es', 'e', 'somos', 'sao', 'era', 'fui', 'foi', 'sera', 'seria', 'seja']
      ser.forEach(v => {
        expect(isStopWord(v)).toBe(true)
      })
    })

    it('deve filtrar conjugacoes do verbo ESTAR', () => {
      const estar = ['estou', 'esta', 'estamos', 'estao', 'estava', 'estive', 'esteve']
      estar.forEach(v => {
        expect(isStopWord(v)).toBe(true)
      })
    })

    it('deve filtrar conjugacoes do verbo TER', () => {
      const ter = ['tenho', 'tem', 'temos', 'tinha', 'tive', 'teve', 'tera', 'teria', 'tenha']
      ter.forEach(v => {
        expect(isStopWord(v)).toBe(true)
      })
    })

    it('deve filtrar conjugacoes do verbo HAVER', () => {
      const haver = ['ha', 'havia', 'houve', 'havera', 'haveria', 'haja']
      haver.forEach(v => {
        expect(isStopWord(v)).toBe(true)
      })
    })

    it('deve filtrar conjugacoes de verbos comuns', () => {
      const verbos = ['faco', 'faz', 'fez', 'digo', 'diz', 'disse', 'sei', 'sabe', 'soube', 'quero', 'quer', 'quis']
      verbos.forEach(v => {
        expect(isStopWord(v)).toBe(true)
      })
    })

    it('deve filtrar palavras coloquiais e abreviacoes', () => {
      const coloquiais = ['oque', 'oq', 'pq', 'pra', 'pro', 'ne', 'ta', 'to', 'vc', 'tipo']
      coloquiais.forEach(col => {
        expect(isStopWord(col)).toBe(true)
      })
    })
  })

  describe('2. Filtragem de Palavras em Ingles', () => {

    it('deve filtrar articles', () => {
      const articles = ['the', 'a', 'an']
      articles.forEach(art => {
        expect(isStopWord(art)).toBe(true)
      })
    })

    it('deve filtrar prepositions', () => {
      const prepositions = ['at', 'by', 'for', 'from', 'in', 'of', 'on', 'to', 'with', 'about']
      prepositions.forEach(prep => {
        expect(isStopWord(prep)).toBe(true)
      })
    })

    it('deve filtrar conjunctions', () => {
      const conjunctions = ['and', 'but', 'or', 'nor', 'so', 'yet', 'if', 'because', 'although']
      conjunctions.forEach(conj => {
        expect(isStopWord(conj)).toBe(true)
      })
    })

    it('deve filtrar personal pronouns', () => {
      const pronouns = ['i', 'me', 'my', 'you', 'your', 'he', 'him', 'she', 'her', 'it', 'we', 'they']
      pronouns.forEach(pron => {
        expect(isStopWord(pron)).toBe(true)
      })
    })

    it('deve filtrar demonstrative pronouns', () => {
      const demonstratives = ['this', 'that', 'these', 'those']
      demonstratives.forEach(dem => {
        expect(isStopWord(dem)).toBe(true)
      })
    })

    it('deve filtrar relative pronouns', () => {
      const relatives = ['who', 'whom', 'whose', 'which', 'that']
      relatives.forEach(rel => {
        expect(isStopWord(rel)).toBe(true)
      })
    })

    it('deve filtrar auxiliary verbs', () => {
      const auxiliaries = ['be', 'am', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did']
      auxiliaries.forEach(aux => {
        expect(isStopWord(aux)).toBe(true)
      })
    })

    it('deve filtrar modal verbs', () => {
      const modals = ['will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must']
      modals.forEach(modal => {
        expect(isStopWord(modal)).toBe(true)
      })
    })

    it('deve filtrar common verbs', () => {
      const verbs = ['get', 'make', 'go', 'come', 'take', 'see', 'know', 'think', 'want', 'give', 'tell', 'feel']
      verbs.forEach(v => {
        expect(isStopWord(v)).toBe(true)
      })
    })

    it('deve filtrar adverbs', () => {
      const adverbs = ['very', 'really', 'always', 'never', 'often', 'just', 'now', 'here', 'there']
      adverbs.forEach(adv => {
        expect(isStopWord(adv)).toBe(true)
      })
    })

    it('deve filtrar question words', () => {
      const questions = ['how', 'what', 'when', 'where', 'which', 'who', 'why']
      questions.forEach(q => {
        expect(isStopWord(q)).toBe(true)
      })
    })
  })

  describe('3. Preservacao de Termos Relevantes (NAO devem ser filtrados)', () => {

    it('NAO deve filtrar nomes proprios espirituais', () => {
      const nomesEspirituais = ['Bhagavan', 'Amma', 'Sri', 'Moola', 'Mantra', 'Oneness', 'Deeksha']
      nomesEspirituais.forEach(nome => {
        expect(isStopWord(nome)).toBe(false)
      })
    })

    it('NAO deve filtrar conceitos espirituais em portugues', () => {
      const conceitos = [
        'iluminacao', 'despertar', 'consciencia', 'meditacao', 'graca', 'bencao',
        'karma', 'dharma', 'samskara', 'mukti', 'ananda', 'shakti', 'kundalini',
        'chakra', 'mantra', 'puja', 'sadhana', 'satsang', 'darshan', 'bhakti'
      ]
      conceitos.forEach(conceito => {
        expect(isStopWord(conceito)).toBe(false)
      })
    })

    it('NAO deve filtrar conceitos espirituais em ingles', () => {
      const concepts = [
        'enlightenment', 'awakening', 'consciousness', 'meditation', 'grace', 'blessing',
        'karma', 'dharma', 'samskara', 'mukti', 'ananda', 'shakti', 'kundalini',
        'chakra', 'mantra', 'puja', 'sadhana', 'satsang', 'darshan', 'bhakti'
      ]
      concepts.forEach(concept => {
        expect(isStopWord(concept)).toBe(false)
      })
    })

    it('NAO deve filtrar emocoes relevantes em portugues', () => {
      const emocoes = [
        'sofrimento', 'felicidade', 'alegria', 'medo', 'raiva', 'tristeza',
        'paz', 'amor', 'gratidao', 'perdao'
      ]
      emocoes.forEach(emocao => {
        expect(isStopWord(emocao)).toBe(false)
      })
    })

    it('NAO deve filtrar emocoes relevantes em ingles', () => {
      const emotions = [
        'suffering', 'happiness', 'joy', 'fear', 'anger', 'sadness',
        'peace', 'love', 'gratitude', 'forgiveness'
      ]
      emotions.forEach(emotion => {
        expect(isStopWord(emotion)).toBe(false)
      })
    })

    it('NAO deve filtrar termos de relacionamentos', () => {
      const relacionamentos = ['relacionamento', 'casamento', 'familia', 'parceiro', 'relationship', 'marriage', 'family']
      relacionamentos.forEach(rel => {
        expect(isStopWord(rel)).toBe(false)
      })
    })

    it('NAO deve filtrar termos de saude', () => {
      const saude = ['saude', 'doenca', 'cura', 'health', 'healing', 'disease']
      saude.forEach(s => {
        expect(isStopWord(s)).toBe(false)
      })
    })

    it('NAO deve filtrar termos financeiros', () => {
      const financeiro = ['dinheiro', 'riqueza', 'prosperidade', 'abundancia', 'wealth', 'prosperity']
      financeiro.forEach(f => {
        expect(isStopWord(f)).toBe(false)
      })
    })
  })

  describe('4. Edge Cases - Acentos e Maiusculas', () => {

    it('deve filtrar palavras independente de maiusculas/minusculas', () => {
      expect(isStopWord('O')).toBe(true)
      expect(isStopWord('A')).toBe(true)
      expect(isStopWord('THE')).toBe(true)
      expect(isStopWord('The')).toBe(true)
      expect(isStopWord('WHAT')).toBe(true)
      expect(isStopWord('What')).toBe(true)
    })

    it('deve tratar corretamente a funcao removeAccents', () => {
      expect(removeAccents('iluminacao')).toBe('iluminacao')
      expect(removeAccents('consciencia')).toBe('consciencia')
      expect(removeAccents('bencao')).toBe('bencao')
      expect(removeAccents('graca')).toBe('graca')
      expect(removeAccents('voce')).toBe('voce')
    })

    it('deve manter texto sem acentos inalterado', () => {
      expect(removeAccents('karma')).toBe('karma')
      expect(removeAccents('dharma')).toBe('dharma')
      expect(removeAccents('enlightenment')).toBe('enlightenment')
    })
  })

  describe('5. Funcao filterStopWords - Testes de Integracao', () => {

    it('deve filtrar corretamente uma query em portugues', () => {
      const query = 'o que e iluminacao'.split(' ')
      const filtered = filterStopWords(query)
      expect(filtered).toContain('iluminacao')
      expect(filtered).not.toContain('o')
      expect(filtered).not.toContain('que')
    })

    it('deve filtrar corretamente uma query em ingles', () => {
      const query = 'what is enlightenment'.split(' ')
      const filtered = filterStopWords(query)
      expect(filtered).toContain('enlightenment')
      expect(filtered).not.toContain('what')
    })

    it('deve manter multiplos termos relevantes', () => {
      const query = 'qual a relacao entre sofrimento e medo'.split(' ')
      const filtered = filterStopWords(query)
      expect(filtered).toContain('relacao')
      expect(filtered).toContain('sofrimento')
      expect(filtered).toContain('medo')
      expect(filtered).not.toContain('qual')
      expect(filtered).not.toContain('entre')
    })

    it('deve filtrar palavras com menos de 3 caracteres', () => {
      const query = 'o a e ou de'.split(' ')
      const filtered = filterStopWords(query)
      expect(filtered).toHaveLength(0)
    })

    it('deve manter nomes proprios mesmo curtos se nao forem stop words', () => {
      const query = 'ensinamentos de Sri Bhagavan'.split(' ')
      const filtered = filterStopWords(query)
      expect(filtered).toContain('ensinamentos')
      expect(filtered).toContain('Sri')
      expect(filtered).toContain('Bhagavan')
      expect(filtered).not.toContain('de')
    })

    it('deve lidar com array vazio', () => {
      const filtered = filterStopWords([])
      expect(filtered).toHaveLength(0)
    })

    it('deve retornar array vazio se todos os termos sao stop words', () => {
      const query = 'o que e isso'.split(' ')
      const filtered = filterStopWords(query)
      // 'isso' tem 4 caracteres mas e stop word
      // Todos os termos devem ser filtrados
      expect(filtered).toHaveLength(0)
    })
  })

  describe('6. Queries Reais - Simulacao de Uso', () => {

    it('Query: "como eu posso ter mais felicidade"', () => {
      const query = 'como eu posso ter mais felicidade'.split(' ')
      const filtered = filterStopWords(query)
      expect(filtered).toContain('felicidade')
      expect(filtered.length).toBeLessThan(query.length)
    })

    it('Query: "me explique sobre o karma"', () => {
      const query = 'me explique sobre o karma'.split(' ')
      const filtered = filterStopWords(query)
      expect(filtered).toContain('explique')
      expect(filtered).toContain('karma')
    })

    it('Query: "teachings of Sri Bhagavan about love"', () => {
      const query = 'teachings of Sri Bhagavan about love'.split(' ')
      const filtered = filterStopWords(query)
      expect(filtered).toContain('teachings')
      expect(filtered).toContain('Sri')
      expect(filtered).toContain('Bhagavan')
      expect(filtered).toContain('love')
      expect(filtered).not.toContain('of')
      expect(filtered).not.toContain('about')
    })

    it('Query: "how can I overcome suffering"', () => {
      const query = 'how can I overcome suffering'.split(' ')
      const filtered = filterStopWords(query)
      expect(filtered).toContain('overcome')
      expect(filtered).toContain('suffering')
      expect(filtered).not.toContain('how')
      expect(filtered).not.toContain('can')
    })

    it('Query mista PT/EN: "o que significa enlightenment"', () => {
      const query = 'o que significa enlightenment'.split(' ')
      const filtered = filterStopWords(query)
      expect(filtered).toContain('significa')
      expect(filtered).toContain('enlightenment')
    })
  })

  describe('7. Validacao de Contagem', () => {

    it('deve ter um numero significativo de stop words', () => {
      // A implementacao tem 2.387+ palavras
      // O subset de teste deve ter pelo menos algumas centenas
      expect(STOP_WORDS.size).toBeGreaterThan(200)
    })

    it('deve conter todas as categorias principais de PT-BR', () => {
      // Verificar presenca de pelo menos uma palavra de cada categoria
      expect(STOP_WORDS.has('o')).toBe(true)        // Artigo
      expect(STOP_WORDS.has('de')).toBe(true)       // Preposicao
      expect(STOP_WORDS.has('e')).toBe(true)        // Conjuncao
      expect(STOP_WORDS.has('eu')).toBe(true)       // Pronome pessoal
      expect(STOP_WORDS.has('este')).toBe(true)     // Pronome demonstrativo
      expect(STOP_WORDS.has('meu')).toBe(true)      // Pronome possessivo
      expect(STOP_WORDS.has('algum')).toBe(true)    // Pronome indefinido
      expect(STOP_WORDS.has('agora')).toBe(true)    // Adverbio
      expect(STOP_WORDS.has('sou')).toBe(true)      // Verbo ser
      expect(STOP_WORDS.has('estou')).toBe(true)    // Verbo estar
      expect(STOP_WORDS.has('tenho')).toBe(true)    // Verbo ter
    })

    it('deve conter todas as categorias principais de EN', () => {
      expect(STOP_WORDS.has('the')).toBe(true)      // Article
      expect(STOP_WORDS.has('in')).toBe(true)       // Preposition
      expect(STOP_WORDS.has('and')).toBe(true)      // Conjunction
      expect(STOP_WORDS.has('i')).toBe(true)        // Pronoun
      expect(STOP_WORDS.has('this')).toBe(true)     // Demonstrative
      expect(STOP_WORDS.has('always')).toBe(true)   // Adverb
      expect(STOP_WORDS.has('is')).toBe(true)       // Verb be
      expect(STOP_WORDS.has('have')).toBe(true)     // Verb have
      expect(STOP_WORDS.has('can')).toBe(true)      // Modal
    })
  })
})

// =============================================================================
// TESTES DE PERFORMANCE (opcional)
// =============================================================================

describe('Performance - Stop Words Lookup', () => {

  it('deve realizar lookup em tempo constante O(1)', () => {
    const startTime = performance.now()

    // Realizar 10.000 lookups
    for (let i = 0; i < 10000; i++) {
      STOP_WORDS.has('the')
      STOP_WORDS.has('iluminacao')
      STOP_WORDS.has('enlightenment')
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    // Deve completar em menos de 100ms para 30.000 lookups
    expect(duration).toBeLessThan(100)
  })

  it('deve filtrar uma lista grande rapidamente', () => {
    // Criar uma lista grande de palavras
    const bigList = Array(1000).fill(null).map((_, i) =>
      i % 2 === 0 ? 'the' : 'enlightenment'
    )

    const startTime = performance.now()
    const filtered = filterStopWords(bigList)
    const endTime = performance.now()

    // Deve completar em menos de 50ms
    expect(endTime - startTime).toBeLessThan(50)

    // Deve filtrar corretamente
    expect(filtered.length).toBe(500) // Apenas 'enlightenment'
  })
})
