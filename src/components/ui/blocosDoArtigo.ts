/**
 * Lógica dos blocos visuais do corpo do artigo. Fica fora do componente para ser testada sem
 * renderizar: o que decide se um trecho vira caixa, fluxo ou imagem mora aqui.
 */

export type TipoDeCaixa = 'resumo' | 'dica' | 'atencao' | 'importante'

export type TipoDeBloco = TipoDeCaixa | 'passos' | 'detalhes'

const TIPO_POR_MARCADOR: Readonly<Record<string, TipoDeBloco>> = {
  RESUMO: 'resumo',
  DICA: 'dica',
  ATENCAO: 'atencao',
  IMPORTANTE: 'importante',
  PASSOS: 'passos',
  DETALHES: 'detalhes',
}

const MARCADOR = /^\[!([A-Z]+)\][ \t]*/

export interface MarcadorDetectado {
  tipo: TipoDeBloco
  /** Quantos caracteres do início do texto pertencem ao marcador (com o espaço seguinte). */
  comprimento: number
}

/** Marcador desconhecido devolve `null`: o blockquote fica comum e o texto continua visível. */
export function detectarMarcador(texto: string): MarcadorDetectado | null {
  const achado = MARCADOR.exec(texto)
  if (!achado) return null

  const tipo = TIPO_POR_MARCADOR[achado[1]]
  if (!tipo) return null

  return { tipo, comprimento: achado[0].length }
}

export function ehTipoDeCaixa(valor: unknown): valor is TipoDeCaixa {
  return valor === 'resumo' || valor === 'dica' || valor === 'atencao' || valor === 'importante'
}

const PREFIXO_DAS_IMAGENS = '/imagens/'
const TRECHOS_PROIBIDOS = ['..', '//', '\\', ':', '?', '#']
// Ponto, barra e barra invertida codificados reabririam a saída da pasta que o filtro fecha.
const SEPARADOR_CODIFICADO = /%(2e|2f|5c)/i

/**
 * Só imagem servida pelo próprio portal, dentro de `/imagens/`, vira `<img>`. Endereço externo,
 * `data:`, `javascript:` e caminho relativo devolvem `null`.
 */
export function caminhoDeImagemSeguro(src: string | null | undefined): string | null {
  if (!src || !src.startsWith(PREFIXO_DAS_IMAGENS)) return null
  if (src.length === PREFIXO_DAS_IMAGENS.length) return null
  if (TRECHOS_PROIBIDOS.some((trecho) => src.includes(trecho))) return null
  if (SEPARADOR_CODIFICADO.test(src) || /\s/.test(src)) return null
  return src
}

export interface EtapaDoFluxo {
  titulo: string
  descricao?: string
}

/** Uma etapa por linha, no formato `Título: descrição`; linha sem dois-pontos é só título. */
export function interpretarFluxo(texto: string): EtapaDoFluxo[] {
  return texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0)
    .map((linha) => {
      const separador = linha.indexOf(':')
      if (separador <= 0) return { titulo: linha }

      const titulo = linha.slice(0, separador).trim()
      const descricao = linha.slice(separador + 1).trim()
      return descricao ? { titulo, descricao } : { titulo }
    })
}

export type ValorSimNao = 'sim' | 'nao'

export function reconhecerSimNao(texto: string): ValorSimNao | null {
  const normalizado = texto.trim().normalize('NFC')
  if (normalizado === 'Sim') return 'sim'
  if (normalizado === 'Não'.normalize('NFC')) return 'nao'
  return null
}

/**
 * Forma mínima dos nós do Markdown (mdast) que o plugin toca. Declarada aqui para não importar
 * tipos de pacote transitivo que o projeto não declara.
 */
interface NoMarkdown {
  type: string
  value?: string
  ordered?: boolean | null
  start?: number | null
  children?: NoMarkdown[]
  data?: { hProperties?: Record<string, string | number> }
}

function textoPlano(no: NoMarkdown): string {
  if (typeof no.value === 'string') return no.value
  return (no.children ?? []).map(textoPlano).join('')
}

function marcarNo(no: NoMarkdown, propriedades: Record<string, string | number>) {
  no.data = { ...no.data, hProperties: { ...no.data?.hProperties, ...propriedades } }
}

/** Tira do parágrafo tudo até a primeira quebra de linha e devolve esse trecho como texto. */
function retirarPrimeiraLinha(paragrafo: NoMarkdown): string {
  const filhos = paragrafo.children ?? []
  let linha = ''

  while (filhos.length > 0) {
    const primeiro = filhos[0]
    const quebra = primeiro.type === 'text' ? (primeiro.value ?? '').indexOf('\n') : -1

    if (quebra >= 0) {
      linha += (primeiro.value ?? '').slice(0, quebra)
      primeiro.value = (primeiro.value ?? '').slice(quebra + 1)
      break
    }

    linha += textoPlano(primeiro)
    filhos.shift()
  }

  return linha.trim()
}

function paragrafoVazio(paragrafo: NoMarkdown): boolean {
  return (paragrafo.children ?? []).every(
    (filho) => filho.type === 'text' && (filho.value ?? '').trim() === '',
  )
}

function marcarPassos(citacao: NoMarkdown) {
  const lista = citacao.children?.find((filho) => filho.type === 'list' && filho.ordered)
  if (!lista) return

  marcarNo(lista, { dataPassos: 'sim' })
  const inicio = lista.start ?? 1
  lista.children?.forEach((item, indice) => marcarNo(item, { dataNumeroPasso: inicio + indice }))
}

function transformarCitacao(citacao: NoMarkdown) {
  const paragrafo = citacao.children?.[0]
  const primeiroTexto = paragrafo?.type === 'paragraph' ? paragrafo.children?.[0] : undefined
  if (!paragrafo || primeiroTexto?.type !== 'text') return

  const marcador = detectarMarcador(primeiroTexto.value ?? '')
  if (!marcador) return

  primeiroTexto.value = (primeiroTexto.value ?? '').slice(marcador.comprimento)

  if (marcador.tipo === 'detalhes') {
    const titulo = retirarPrimeiraLinha(paragrafo)
    marcarNo(citacao, { dataBloco: 'detalhes', dataTitulo: titulo || 'Detalhes' })
  } else {
    primeiroTexto.value = primeiroTexto.value.replace(/^\s+/, '')
    marcarNo(citacao, { dataBloco: marcador.tipo })
  }

  if (paragrafoVazio(paragrafo)) citacao.children?.shift()
  if (marcador.tipo === 'passos') marcarPassos(citacao)
}

function percorrer(no: NoMarkdown) {
  if (no.type === 'blockquote') transformarCitacao(no)
  no.children?.forEach(percorrer)
}

/**
 * Plugin do remark: reconhece o marcador `[!TIPO]` na primeira linha do blockquote, remove-o do
 * texto exibido e anota o tipo como propriedade do elemento. Quem desenha o bloco é o componente
 * do `blockquote` em `ConteudoArtigo`; o remark-gfm não entende os alertas do GitHub.
 */
export function remarkBlocosDoArtigo() {
  return (arvore: NoMarkdown) => {
    percorrer(arvore)
  }
}
