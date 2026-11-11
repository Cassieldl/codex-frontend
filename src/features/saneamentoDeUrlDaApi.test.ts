import { describe, expect, it } from 'vitest'

// Teste de tela com URL válida fica verde sem o saneador; por isso a varredura segue o dado.
const FONTES_DO_APP = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const LEITURA_DE_URL = /(?:[\w$]+(?:\??\.[\w$]+)*|[)\]])\??\.url\b/g
const CHAMADA_AO_SANEADOR = /(?<!function )\bcaminhoInternoSeguro\(/g
const ATRIBUTO_KEY = /\bkey=\{/g
const DESESTRUTURACAO_DE_URL = /\{[^{}]*\burl\b[^{}]*\}\s*[=:]/

type Contexto = 'saneada' | 'key' | 'crua'

interface LeituraDeUrl {
  arquivo: string
  trecho: string
  contexto: Contexto
}

/** Apaga comentários trocando cada caractere por espaço, para o número da linha seguir o arquivo. */
function semComentarios(fonte: string): string {
  const apagar = (comentario: string) => comentario.replace(/[^\n]/g, ' ')
  return fonte.replace(/\/\*[\s\S]*?\*\//g, apagar).replace(/^\s*\/\/[^\n]*/gm, apagar)
}

function arquivosDeProducao(): [string, string][] {
  return Object.entries(FONTES_DO_APP)
    .filter(([caminho]) => !/\.test\.tsx?$/.test(caminho) && !caminho.startsWith('/src/test/'))
    .map(([caminho, fonte]) => [caminho, semComentarios(fonte)])
}

/** Índice logo após o delimitador que fecha o que abre em `inicio`, contando aninhamento. */
function fimDoBloco(fonte: string, inicio: number, abre: string, fecha: string): number {
  let profundidade = 0

  for (let indice = inicio; indice < fonte.length; indice++) {
    if (fonte[indice] === abre) profundidade++
    if (fonte[indice] === fecha) profundidade--
    if (profundidade === 0) return indice + 1
  }

  return -1
}

function trechos(fonte: string, padrao: RegExp, abre: string, fecha: string): [number, number][] {
  return [...fonte.matchAll(padrao)].map((casamento) => {
    const inicio = casamento.index + casamento[0].length - 1
    return [inicio, fimDoBloco(fonte, inicio, abre, fecha)]
  })
}

function leiturasDeUrl(): LeituraDeUrl[] {
  return arquivosDeProducao().flatMap(([arquivo, fonte]) => {
    const saneadas = trechos(fonte, CHAMADA_AO_SANEADOR, '(', ')')
    const keys = trechos(fonte, ATRIBUTO_KEY, '{', '}')
    const contem =
      (indice: number) =>
      ([inicio, fim]: [number, number]) =>
        indice > inicio && indice < fim

    return [...fonte.matchAll(LEITURA_DE_URL)].map((leitura): LeituraDeUrl => {
      const linha = fonte.slice(0, leitura.index).split('\n').length
      const trecho = `${arquivo}:${linha} ${leitura[0]}`

      if (saneadas.some(contem(leitura.index))) return { arquivo, trecho, contexto: 'saneada' }
      if (keys.some(contem(leitura.index))) return { arquivo, trecho, contexto: 'key' }
      return { arquivo, trecho, contexto: 'crua' }
    })
  })
}

describe('url da API só vira link depois de caminhoInternoSeguro, que fecha javascript: e //host-externo', () => {
  it('a varredura enxerga as leituras de url', () => {
    // Hoje são 10 leituras: 6 dentro do saneador e 4 como key de lista.
    const leituras = leiturasDeUrl()

    expect(leituras.length).toBeGreaterThanOrEqual(10)
    expect(
      leituras.filter((leitura) => leitura.contexto === 'saneada').length,
    ).toBeGreaterThanOrEqual(6)
  })

  it('toda leitura de url em produção está dentro do saneador ou é só key de lista', () => {
    const cruas = leiturasDeUrl()
      .filter((leitura) => leitura.contexto === 'crua')
      .map((leitura) => leitura.trecho)

    expect(cruas).toEqual([])
  })

  it('nenhum arquivo desestrutura url para fugir da varredura', () => {
    const desestruturam = arquivosDeProducao()
      .filter(([, fonte]) => DESESTRUTURACAO_DE_URL.test(fonte))
      .map(([arquivo]) => arquivo)

    expect(desestruturam).toEqual([])
  })
})
