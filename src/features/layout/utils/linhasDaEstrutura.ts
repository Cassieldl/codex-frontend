import type { FormatoDaEstrutura, NoEstrutura } from '../types/estruturaLayout'

/**
 * Uma linha do texto renderizado. O texto é `indentação + prefixo + nome do nó + sufixo`; o nome
 * fica separado para a tela transformá-lo em botão sem remontar a linha.
 */
export interface LinhaDaEstrutura {
  profundidade: number
  prefixo: string
  /** Nó que a linha abre ou a folha que ela mostra; `null` em fechamento e moldura. */
  no: NoEstrutura | null
  sufixo: string
  /** Profundidade do nó na árvore (raiz = 0), usada no "aberto por padrão". */
  nivel: number
  /** Na linha que abre um grupo com filhos: índice da linha que o fecha. */
  fimDoGrupo: number | null
}

export interface AncoraDaEstrutura {
  /** Primeira linha da tag: só ela recebe o `id` da âncora. */
  linha: number
  /** Linhas de abertura dos grupos que contêm a tag, de fora para dentro. */
  grupos: number[]
}

export interface EstruturaEmLinhas {
  linhas: LinhaDaEstrutura[]
  /** Por `campoSlug`, em ordem de aparição. */
  ancoras: Map<string, AncoraDaEstrutura>
}

const INDENTACAO = '  '

/** Até que nível da árvore os grupos nascem abertos: raiz e filhos diretos. */
export const NIVEIS_ABERTOS_POR_PADRAO = 2

// Número JSON válido (sem zero à esquerda): "0" e "0.00" saem sem aspas.
const NUMERO_JSON = /^-?(0|[1-9]\d*)(\.\d+)?$/

function escaparXml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function valorJson(valorModelo: string | null): string {
  if (valorModelo === null) return 'null'
  if (NUMERO_JSON.test(valorModelo)) return valorModelo
  return JSON.stringify(valorModelo)
}

class MontadorDeLinhas {
  readonly linhas: LinhaDaEstrutura[] = []
  readonly ancoras = new Map<string, AncoraDaEstrutura>()
  private readonly gruposAbertos: number[] = []

  linhaDeNo(profundidade: number, nivel: number, prefixo: string, no: NoEstrutura, sufixo: string) {
    const indice = this.adicionar({ profundidade, prefixo, no, sufixo, nivel, fimDoGrupo: null })
    if (no.campoSlug !== null && !this.ancoras.has(no.campoSlug)) {
      this.ancoras.set(no.campoSlug, { linha: indice, grupos: [...this.gruposAbertos] })
    }
    return indice
  }

  linhaDeTexto(profundidade: number, nivel: number, texto: string) {
    return this.adicionar({
      profundidade,
      prefixo: texto,
      no: null,
      sufixo: '',
      nivel,
      fimDoGrupo: null,
    })
  }

  /** Emite a abertura, o conteúdo e o fechamento de um grupo recolhível. */
  grupo(abertura: number, conteudo: () => void, fechamento: () => number) {
    this.gruposAbertos.push(abertura)
    conteudo()
    this.gruposAbertos.pop()
    this.linhas[abertura].fimDoGrupo = fechamento()
  }

  private adicionar(linha: LinhaDaEstrutura) {
    this.linhas.push(linha)
    return this.linhas.length - 1
  }
}

function emitirXml(montador: MontadorDeLinhas, no: NoEstrutura, nivel: number) {
  if (!no.ehGrupo || no.filhos.length === 0) {
    const valor = no.valorModelo === null ? '' : escaparXml(no.valorModelo)
    montador.linhaDeNo(nivel, nivel, '<', no, valor === '' ? '/>' : `>${valor}</${no.nome}>`)
    return
  }

  const abertura = montador.linhaDeNo(nivel, nivel, '<', no, '>')
  montador.grupo(
    abertura,
    () => no.filhos.forEach((filho) => emitirXml(montador, filho, nivel + 1)),
    () => montador.linhaDeTexto(nivel, nivel, `</${no.nome}>`),
  )
}

/*
 * Convenção REST do InvoiCy: o envio é um array com um objeto `{ "Documento": {...} }`; nó com
 * `repete` vira array com um exemplo; `valorModelo` que é número JSON ("0", "0.00") sai sem aspas
 * e o resto sai como string.
 */
function emitirJson(
  montador: MontadorDeLinhas,
  no: NoEstrutura,
  profundidade: number,
  nivel: number,
  comVirgula: boolean,
) {
  const virgula = comVirgula ? ',' : ''

  if (!no.ehGrupo) {
    const valor = valorJson(no.valorModelo)
    montador.linhaDeNo(
      profundidade,
      nivel,
      '"',
      no,
      `": ${no.repete ? `[${valor}]` : valor}${virgula}`,
    )
    return
  }

  if (no.filhos.length === 0) {
    montador.linhaDeNo(profundidade, nivel, '"', no, `": ${no.repete ? '[{}]' : '{}'}${virgula}`)
    return
  }

  const profundidadeDosFilhos = profundidade + (no.repete ? 2 : 1)
  const emitirFilhos = () =>
    no.filhos.forEach((filho, indice) =>
      emitirJson(montador, filho, profundidadeDosFilhos, nivel + 1, indice < no.filhos.length - 1),
    )

  const abertura = montador.linhaDeNo(profundidade, nivel, '"', no, no.repete ? '": [' : '": {')
  montador.grupo(
    abertura,
    () => {
      if (!no.repete) {
        emitirFilhos()
        return
      }
      montador.linhaDeTexto(profundidade + 1, nivel, '{')
      emitirFilhos()
      montador.linhaDeTexto(profundidade + 1, nivel, '}')
    },
    () => montador.linhaDeTexto(profundidade, nivel, `${no.repete ? ']' : '}'}${virgula}`),
  )
}

/** Converte a árvore de um formato nas linhas que a tela mostra e o arquivo baixado contém. */
export function montarLinhasDaEstrutura(
  raiz: NoEstrutura,
  formato: FormatoDaEstrutura,
): EstruturaEmLinhas {
  const montador = new MontadorDeLinhas()

  if (formato === 'xml') {
    emitirXml(montador, raiz, 0)
  } else {
    montador.linhaDeTexto(0, 0, '[')
    montador.linhaDeTexto(1, 0, '{')
    // A raiz já está dentro do array do envio: `repete` nela não abriria outro.
    emitirJson(montador, { ...raiz, repete: false }, 2, 0, false)
    montador.linhaDeTexto(1, 0, '}')
    montador.linhaDeTexto(0, 0, ']')
  }

  return { linhas: montador.linhas, ancoras: montador.ancoras }
}

export function textoDaLinha(linha: LinhaDaEstrutura): string {
  return `${INDENTACAO.repeat(linha.profundidade)}${linha.prefixo}${linha.no?.nome ?? ''}${linha.sufixo}`
}

/** Texto completo, sem levar em conta o que está recolhido na tela. */
export function serializarEstrutura(raiz: NoEstrutura, formato: FormatoDaEstrutura): string {
  const { linhas } = montarLinhasDaEstrutura(raiz, formato)
  return `${linhas.map(textoDaLinha).join('\n')}\n`
}

/** Linhas de abertura dos grupos que nascem abertos. */
export function gruposAbertosPorPadrao(linhas: LinhaDaEstrutura[]): Set<number> {
  const abertos = new Set<number>()
  linhas.forEach((linha, indice) => {
    if (linha.fimDoGrupo !== null && linha.nivel < NIVEIS_ABERTOS_POR_PADRAO) abertos.add(indice)
  })
  return abertos
}
