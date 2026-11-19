export type FormatoRealcado = 'xml' | 'json'

export type TipoDoTrecho = 'tag' | 'valor' | 'pontuacao'

export interface TrechoRealcado {
  tipo: TipoDoTrecho
  texto: string
}

const PARTES_XML = /<\/?|\/?>|[^<>]+/g

// Ordem importa: string, número e literal antes da pontuação; o "." final pega o que sobrar.
const PARTES_JSON =
  /"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b|[\s:,[\]{}]+|./gs

const CHAVE_JSON = /^\s*:/

function juntar(trechos: TrechoRealcado[], tipo: TipoDoTrecho, texto: string) {
  const ultimo = trechos.at(-1)
  if (ultimo?.tipo === tipo) ultimo.texto += texto
  else trechos.push({ tipo, texto })
}

function realcarXml(texto: string): TrechoRealcado[] {
  const trechos: TrechoRealcado[] = []
  let dentroDaTag = false

  for (const [parte] of texto.matchAll(PARTES_XML)) {
    if (parte === '<' || parte === '</') {
      dentroDaTag = true
      juntar(trechos, 'pontuacao', parte)
    } else if (parte === '>' || parte === '/>') {
      dentroDaTag = false
      juntar(trechos, 'pontuacao', parte)
    } else {
      juntar(trechos, dentroDaTag ? 'tag' : 'valor', parte)
    }
  }

  return trechos
}

function realcarJson(texto: string, aposNome: boolean): TrechoRealcado[] {
  const trechos: TrechoRealcado[] = []
  // Depois do nome da chave, a primeira aspa fecha a chave: não abre um valor.
  const inicio = aposNome && texto.startsWith('"') ? 1 : 0
  if (inicio === 1) juntar(trechos, 'pontuacao', '"')

  const resto = texto.slice(inicio)
  for (const achado of resto.matchAll(PARTES_JSON)) {
    const parte = achado[0]
    const depois = resto.slice((achado.index ?? 0) + parte.length)

    if (parte.length > 1 && parte.startsWith('"')) {
      juntar(trechos, CHAVE_JSON.test(depois) ? 'tag' : 'valor', parte)
    } else if (/^(-?\d|true$|false$|null$)/.test(parte)) {
      juntar(trechos, 'valor', parte)
    } else {
      juntar(trechos, 'pontuacao', parte)
    }
  }

  return trechos
}

/**
 * Separa um pedaço de linha de XML ou JSON em tag, valor e pontuação, para colorir sem biblioteca.
 * `aposNome` diz que o pedaço vem logo depois do nome de uma chave JSON, cuja aspa de fechamento
 * abre o pedaço.
 */
export function realcarTrecho(
  texto: string,
  formato: FormatoRealcado,
  aposNome = false,
): TrechoRealcado[] {
  if (texto === '') return []
  return formato === 'xml' ? realcarXml(texto) : realcarJson(texto, aposNome)
}
