import type { TrechoResultado } from '../types/resultadoBusca'
import { limparMarcacaoDosTrechos } from './limparMarcacaoDeTrecho'

const DIACRITICOS = /[̀-ͯ]/g

const PALAVRA = /[a-z0-9]+/g

const FIM_DE_FRASE = /(?<=[.!?])\s+/

const TERMINA_FRASE = /[.!?]$/

const RETICENCIAS_NO_FIM = /\s*(?:…|\.\.\.)$/

const ESPACO_ENTRE_FRASES: TrechoResultado = { texto: ' ', destacado: false }

const RETICENCIAS: TrechoResultado = { texto: '…', destacado: false }

/** Texto conhecido mais curto que isto não serve para reconhecer repetição: casaria por acaso. */
const MINIMO_PARA_RECONHECER_REPETICAO = 20

/** Palavras que podem vir em volta de um texto já mostrado, como "Regra da Sefin:". */
const MAXIMO_DE_PALAVRAS_DO_ROTULO = 4

/** Fragmento solto no fim do trecho, cortado pelo servidor, com até tantas palavras. */
const MAXIMO_DE_PALAVRAS_DA_SOBRA = 2

function palavrasDe(texto: string): string[] {
  return texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().match(PALAVRA) ?? []
}

/** Só as palavras, separadas por um espaço: compara frases ignorando acento e pontuação. */
function formaComparavel(texto: string): string {
  return palavrasDe(texto).join(' ')
}

function textoDa(frase: readonly TrechoResultado[]): string {
  return frase.map((parte) => parte.texto).join('')
}

/**
 * Agrupa os fragmentos em frases sem perder o destaque: um fragmento pode terminar uma frase e
 * começar a seguinte, e uma frase pode ter vários fragmentos destacados no meio.
 */
function dividirEmFrases(trechos: readonly TrechoResultado[]): TrechoResultado[][] {
  const frases: TrechoResultado[][] = []
  let fraseAtual: TrechoResultado[] = []

  for (const trecho of trechos) {
    trecho.texto.split(FIM_DE_FRASE).forEach((parte, indice) => {
      if (indice > 0) {
        if (fraseAtual.length > 0) frases.push(fraseAtual)
        fraseAtual = []
      }
      if (parte !== '') fraseAtual.push({ texto: parte, destacado: trecho.destacado })
    })
  }

  if (fraseAtual.length > 0) frases.push(fraseAtual)
  return frases
}

function aparar(frase: readonly TrechoResultado[]): TrechoResultado[] {
  const ultimo = frase.length - 1
  return frase
    .map((parte, indice) => {
      let texto = parte.texto
      if (indice === 0) texto = texto.trimStart()
      if (indice === ultimo) texto = texto.trimEnd()
      return { ...parte, texto }
    })
    .filter((parte) => parte.texto !== '')
}

/** Tira o código do erro da frente da frase: o indexador começa o texto por ele. */
function semCodigoNaFrente(frase: readonly TrechoResultado[], codigo: string | null) {
  const aparada = aparar(frase)
  const primeira = aparada[0]
  if (!codigo || !primeira?.texto.startsWith(codigo)) return aparada

  const resto = primeira.texto.slice(codigo.length)
  if (resto !== '' && !/^\s/.test(resto)) return aparada

  return aparar([{ ...primeira, texto: resto }, ...aparada.slice(1)])
}

function juntarFrases(frases: readonly TrechoResultado[][]): TrechoResultado[] {
  return frases.flatMap((frase, indice) => (indice === 0 ? frase : [ESPACO_ENTRE_FRASES, ...frase]))
}

/** A frase é o texto já mostrado com no máximo um rótulo curto em volta. */
function repeteComRotulo(frase: string, conhecido: string): boolean {
  // Os espaços nas pontas fazem casar só palavras inteiras.
  const fraseComBordas = ` ${frase} `
  const conhecidoComBordas = ` ${conhecido} `
  if (!fraseComBordas.includes(conhecidoComBordas)) return false

  const sobra = fraseComBordas.replace(conhecidoComBordas, ' ').trim()
  return sobra === '' || sobra.split(' ').length <= MAXIMO_DE_PALAVRAS_DO_ROTULO
}

export interface TituloDoCartao {
  /** O título em fragmentos, com o destaque do termo quando veio do trecho. */
  titulo: TrechoResultado[]
  /** O trecho sem a frase que virou título. */
  trechos: TrechoResultado[]
  /** O título saiu do trecho: já vem sem marcação e com o destaque. */
  veioDoTrecho: boolean
}

/** A frase vira título com a mesma inicial do título: o trecho pode começar no meio da regra. */
function comInicialDoTitulo(frase: TrechoResultado[], titulo: string): TrechoResultado[] {
  const [primeira, ...resto] = frase
  if (!primeira) return frase
  return [{ ...primeira, texto: titulo.charAt(0) + primeira.texto.slice(1) }, ...resto]
}

/**
 * Se uma frase do trecho (sem o código na frente) começa pelo texto do título e vai além dele, ela
 * é a mesma mensagem mais completa: entra no lugar do título, com o termo destacado, e sai do
 * trecho. Vale para o título cortado em "…" e para o inteiro seguido de uma condição ("... deve
 * ser informado se ..."). No título inteiro, a continuação precisa trazer palavra que o cartão
 * ainda não mostra (`outrosTextosVisiveis`, como a solução): senão é só a mensagem repetida
 * colada nela mesma. Se o servidor também cortou a frase, a reticência fica no fim.
 */
export function resolverTituloDoCartao(
  titulo: string,
  codigo: string | null,
  trechos: readonly TrechoResultado[],
  outrosTextosVisiveis: readonly (string | null)[] = [],
): TituloDoCartao {
  const semAlteracao = {
    titulo: [{ texto: titulo, destacado: false }],
    trechos: [...trechos],
    veioDoTrecho: false,
  }
  const tituloCortado = RETICENCIAS_NO_FIM.test(titulo)
  const inicioDoTitulo = formaComparavel(titulo.replace(RETICENCIAS_NO_FIM, ''))
  if (inicioDoTitulo.length < MINIMO_PARA_RECONHECER_REPETICAO) return semAlteracao

  // Título inteiro só é trocado por frase mais longa: a igual a ele já sai do trecho sozinha.
  const prefixo = tituloCortado ? inicioDoTitulo : `${inicioDoTitulo} `

  const frases = dividirEmFrases(limparMarcacaoDosTrechos(trechos)).map((frase) =>
    semCodigoNaFrente(frase, codigo),
  )
  const conhecidas = new Set(
    [titulo, ...outrosTextosVisiveis].flatMap((texto) => (texto ? palavrasDe(texto) : [])),
  )
  const palavrasDoTitulo = inicioDoTitulo.split(' ').length

  const indice = frases.findIndex((frase) => {
    const palavras = palavrasDe(textoDa(frase))
    if (!palavras.join(' ').startsWith(prefixo)) return false
    if (tituloCortado) return true
    return palavras.slice(palavrasDoTitulo).some((palavra) => !conhecidas.has(palavra))
  })
  if (indice < 0) return semAlteracao

  const fraseDoTitulo = comInicialDoTitulo(frases[indice], titulo)
  const cortadaPeloServidor = !TERMINA_FRASE.test(textoDa(fraseDoTitulo))

  return {
    titulo: cortadaPeloServidor ? [...fraseDoTitulo, RETICENCIAS] : fraseDoTitulo,
    trechos: juntarFrases(frases.filter((_, posicao) => posicao !== indice)),
    veioDoTrecho: true,
  }
}

/**
 * Só as frases do trecho que trazem algo que o cartão ainda não mostra. O indexador junta título,
 * mensagens observadas, regra e solução, e o trecho chegava repetindo o que o cartão já tem. Sai a
 * frase cujas palavras já estão todas no cartão, a que repete um texto já mostrado com um rótulo
 * curto na frente (como "Regra da Sefin:" seguido da mensagem) e a sobra de uma ou duas
 * palavras que o servidor cortou no fim. Cada frase que fica entra no que já foi mostrado, então a repetida dentro do próprio trecho
 * também sai. Lista vazia: o trecho não acrescenta nada.
 */
export function trechosQueAcrescentam(
  trechos: readonly TrechoResultado[],
  textosJaVisiveis: readonly (string | null)[],
): TrechoResultado[] {
  const visiveis = textosJaVisiveis.filter((texto): texto is string => Boolean(texto))
  const conhecidas = new Set(visiveis.flatMap(palavrasDe))
  const textosInteiros = visiveis
    .map(formaComparavel)
    .filter((texto) => texto.length >= MINIMO_PARA_RECONHECER_REPETICAO)

  const frases = dividirEmFrases(limparMarcacaoDosTrechos(trechos))
  const mantidas: TrechoResultado[][] = []

  frases.forEach((frase, indice) => {
    const texto = textoDa(frase)
    const palavras = palavrasDe(texto)
    const comparavel = palavras.join(' ')

    if (palavras.every((palavra) => conhecidas.has(palavra))) return
    if (textosInteiros.some((conhecido) => repeteComRotulo(comparavel, conhecido))) return

    const ehSobraNoFim =
      indice === frases.length - 1 &&
      !TERMINA_FRASE.test(texto.trim()) &&
      palavras.length <= MAXIMO_DE_PALAVRAS_DA_SOBRA
    if (ehSobraNoFim) return

    palavras.forEach((palavra) => conhecidas.add(palavra))
    mantidas.push(aparar(frase))
  })

  return juntarFrases(mantidas)
}
