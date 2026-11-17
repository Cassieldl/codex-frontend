import type { CampoCasado, ResultadoItem, TrechoResultado } from '../types/resultadoBusca'
import { limparMarcacaoDosTrechos } from './limparMarcacaoDeTrecho'

const DIACRITICOS = /[̀-ͯ]/g

const PALAVRA = /[a-z0-9]+/g

const FIM_DE_FRASE = /(?<=[.!?])\s+/

const TERMINA_FRASE = /[.!?]$/

const ESPACO_ENTRE_FRASES: TrechoResultado = { texto: ' ', destacado: false }

/** No erro, o cartão já mostra código, mensagem e solução: o trecho só entra fora deles. */
const CAMPOS_QUE_O_CARTAO_NAO_MOSTRA: ReadonlySet<CampoCasado> = new Set(['causa', 'outro'])

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

export type ItemDoCartao = Pick<
  ResultadoItem,
  | 'tipo'
  | 'titulo'
  | 'chave'
  | 'solucaoResumo'
  | 'provedorNome'
  | 'versaoRotulo'
  | 'campoCasado'
  | 'trechos'
>

/**
 * O trecho que o cartão mostra. No erro, a decisão vem do campo onde o termo casou: código,
 * mensagem e solução já estão no cartão, então o trecho só entra quando casou na causa ou em
 * outro texto. Sem o campo, o erro fica sem trecho, porque repetir a mensagem é o defeito.
 */
export function trechosDoCartao(item: ItemDoCartao): TrechoResultado[] {
  if (item.tipo !== 'erro') return trechosQueAcrescentam(item.trechos, [item.titulo])

  const casouForaDoCartao =
    item.campoCasado != null && CAMPOS_QUE_O_CARTAO_NAO_MOSTRA.has(item.campoCasado)
  if (!casouForaDoCartao) return []

  return trechosQueAcrescentam(item.trechos, [
    item.titulo,
    item.chave,
    item.solucaoResumo,
    item.provedorNome,
    item.versaoRotulo,
  ])
}
