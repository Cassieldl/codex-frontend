/**
 * Lógica dos blocos visuais do corpo do artigo. Fica fora do componente para ser testada sem
 * renderizar: o que decide se um trecho vira caixa, fluxo ou imagem mora aqui.
 */

export type TipoDeAlertaDoArtigo = 'dica' | 'atencao' | 'importante' | 'sucesso'

type TipoEstruturado = 'cartoes' | 'comparativo' | 'checklist'

export type TipoDeBloco = 'resumo' | TipoDeAlertaDoArtigo | TipoEstruturado | 'passos' | 'detalhes'

const TIPO_POR_MARCADOR: Readonly<Record<string, TipoDeBloco>> = {
  RESUMO: 'resumo',
  DICA: 'dica',
  ATENCAO: 'atencao',
  IMPORTANTE: 'importante',
  SUCESSO: 'sucesso',
  PASSOS: 'passos',
  DETALHES: 'detalhes',
  CARTOES: 'cartoes',
  COMPARATIVO: 'comparativo',
  CHECKLIST: 'checklist',
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

export function ehAlertaDoArtigo(valor: unknown): valor is TipoDeAlertaDoArtigo {
  return valor === 'dica' || valor === 'atencao' || valor === 'importante' || valor === 'sucesso'
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
  spread?: boolean | null
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

function textoEmBranco(no: NoMarkdown): boolean {
  return no.type === 'text' && (no.value ?? '').trim() === ''
}

function paragrafoVazio(paragrafo: NoMarkdown): boolean {
  return (paragrafo.children ?? []).every(textoEmBranco)
}

function marcarPassos(citacao: NoMarkdown) {
  const lista = citacao.children?.find((filho) => filho.type === 'list' && filho.ordered)
  if (!lista) return

  // Lista solta mantém o `<p>` do passo: sem ele, cada trecho de texto e de ênfase vira uma linha.
  lista.spread = true
  marcarNo(lista, { dataPassos: 'sim' })
  const inicio = lista.start ?? 1
  lista.children?.forEach((item, indice) => marcarNo(item, { dataNumeroPasso: inicio + indice }))
}

/** Lista única com marcadores, sem nada em volta: a forma comum a cartões e checklist. */
function listaUnica(citacao: NoMarkdown): NoMarkdown | null {
  const filhos = citacao.children ?? []
  const lista = filhos[0]
  if (filhos.length !== 1 || lista.type !== 'list' || lista.ordered) return null
  return lista
}

/** Tira espaço das pontas do trecho e descarta texto que ficou vazio. */
function aparar(trecho: NoMarkdown[]): NoMarkdown[] {
  const copia = trecho.map((no) => ({ ...no }))
  const primeiro = copia[0]
  const ultimo = copia[copia.length - 1]
  if (primeiro?.type === 'text') primeiro.value = (primeiro.value ?? '').trimStart()
  if (ultimo?.type === 'text') ultimo.value = (ultimo.value ?? '').trimEnd()
  return copia.filter((no) => no.type !== 'text' || (no.value ?? '') !== '')
}

/** Separa a linha nas barras `|` do texto; barra dentro de código ou de link não conta. */
function dividirPorBarra(inline: NoMarkdown[]): NoMarkdown[][] {
  const trechos: NoMarkdown[][] = [[]]

  for (const no of inline) {
    if (no.type !== 'text') {
      trechos[trechos.length - 1].push(no)
      continue
    }

    const partes = (no.value ?? '').split('|')
    partes.forEach((parte, indice) => {
      if (indice > 0) trechos.push([])
      if (parte) trechos[trechos.length - 1].push({ type: 'text', value: parte })
    })
  }

  return trechos.map(aparar)
}

function noUnico(trecho: NoMarkdown[] | undefined, tipo: string): NoMarkdown | null {
  return trecho?.length === 1 && trecho[0].type === tipo ? trecho[0] : null
}

/** `**Título** | texto | [link](url)`, com o link opcional. Fora dessa forma, devolve `false`. */
function montarCartao(item: NoMarkdown): boolean {
  const paragrafo = item.children?.[0]
  if (item.children?.length !== 1 || paragrafo?.type !== 'paragraph') return false

  const trechos = dividirPorBarra(paragrafo.children ?? [])
  const titulo = noUnico(trechos[0], 'strong')
  const texto = trechos[1]
  const link = trechos.length === 3 ? noUnico(trechos[2], 'link') : null
  const formaValida = trechos.length === 2 || link !== null
  if (!titulo || !texto?.length || !formaValida) return false

  const paragrafoDoTitulo: NoMarkdown = { type: 'paragraph', children: titulo.children ?? [] }
  const paragrafoDoTexto: NoMarkdown = { type: 'paragraph', children: texto }
  marcarNo(paragrafoDoTitulo, { dataParte: 'tituloCartao' })
  marcarNo(paragrafoDoTexto, { dataParte: 'textoCartao' })

  item.spread = true
  item.children = [paragrafoDoTitulo, paragrafoDoTexto]
  if (link) {
    const paragrafoDaAcao: NoMarkdown = { type: 'paragraph', children: [link] }
    marcarNo(paragrafoDaAcao, { dataParte: 'acaoCartao' })
    item.children.push(paragrafoDaAcao)
  }
  marcarNo(item, { dataTipoItem: 'cartao' })
  return true
}

function montarCartoes(citacao: NoMarkdown): boolean {
  const lista = listaUnica(citacao)
  const itens = lista?.children ?? []
  if (!lista || itens.length === 0 || !itens.every(montarCartao)) return false

  marcarNo(lista, { dataTipoLista: 'cartoes' })
  return true
}

function montarChecklist(citacao: NoMarkdown): boolean {
  const lista = listaUnica(citacao)
  const itens = lista?.children ?? []
  if (!lista || itens.length === 0) return false

  marcarNo(lista, { dataTipoLista: 'checklist' })
  itens.forEach((item) => marcarNo(item, { dataTipoItem: 'checklist' }))
  return true
}

/** Parágrafo que só tem um negrito: o título de uma coluna do comparativo. */
function ehTituloDeColuna(no: NoMarkdown | undefined): boolean {
  if (no?.type !== 'paragraph') return false
  const conteudo = (no.children ?? []).filter((filho) => !textoEmBranco(filho))
  return conteudo.length === 1 && conteudo[0].type === 'strong'
}

/** Duas colunas, cada uma um título em negrito seguido de lista, viram os dois itens de uma lista. */
function montarComparativo(citacao: NoMarkdown): boolean {
  const filhos = citacao.children ?? []
  if (filhos.length !== 4) return false

  const colunas = [filhos.slice(0, 2), filhos.slice(2, 4)]
  const formaValida = colunas.every(
    ([titulo, lista]) => ehTituloDeColuna(titulo) && lista.type === 'list',
  )
  if (!formaValida) return false

  const itens = colunas.map(([titulo, lista]) => {
    marcarNo(titulo, { dataParte: 'tituloColuna' })
    const item: NoMarkdown = { type: 'listItem', spread: true, children: [titulo, lista] }
    marcarNo(item, { dataTipoItem: 'coluna' })
    return item
  })

  const comparativo: NoMarkdown = { type: 'list', ordered: false, spread: true, children: itens }
  marcarNo(comparativo, { dataTipoLista: 'comparativo' })
  citacao.children = [comparativo]
  return true
}

const MONTAGEM_ESTRUTURADA: Readonly<Record<TipoEstruturado, (citacao: NoMarkdown) => boolean>> = {
  cartoes: montarCartoes,
  comparativo: montarComparativo,
  checklist: montarChecklist,
}

function ehEstruturado(tipo: TipoDeBloco): tipo is TipoEstruturado {
  return tipo in MONTAGEM_ESTRUTURADA
}

/**
 * Bloco estruturado só substitui a citação quando a forma inteira bate. Malformado, a citação
 * fica intacta, com o marcador visível, para o redator enxergar o erro no preview.
 */
function transformarEstruturado(
  citacao: NoMarkdown,
  tipo: TipoEstruturado,
  comprimentoDoMarcador: number,
) {
  const copia = structuredClone(citacao)
  const paragrafo = copia.children?.[0]
  const primeiroTexto = paragrafo?.children?.[0]
  if (!paragrafo || !primeiroTexto) return

  primeiroTexto.value = (primeiroTexto.value ?? '').slice(comprimentoDoMarcador).trimStart()
  if (paragrafoVazio(paragrafo)) copia.children?.shift()
  if (!MONTAGEM_ESTRUTURADA[tipo](copia)) return

  citacao.children = copia.children
  marcarNo(citacao, { dataBloco: tipo })
}

/** Texto na linha do marcador vira título quando há conteúdo depois dele; sozinho, é o corpo. */
function transformarAlerta(citacao: NoMarkdown, paragrafo: NoMarkdown, tipo: TipoDeAlertaDoArtigo) {
  const textoDoParagrafo = textoPlano(paragrafo)
  const linhaDoMarcador = textoDoParagrafo.split('\n')[0].trim()
  const temConteudoDepois = textoDoParagrafo.includes('\n') || (citacao.children?.length ?? 0) > 1
  const titulo = linhaDoMarcador && temConteudoDepois ? retirarPrimeiraLinha(paragrafo) : ''

  const primeiroTexto = paragrafo.children?.[0]
  if (primeiroTexto?.type === 'text') {
    primeiroTexto.value = (primeiroTexto.value ?? '').trimStart()
  }
  if (paragrafoVazio(paragrafo)) citacao.children?.shift()

  marcarNo(citacao, titulo ? { dataBloco: tipo, dataTitulo: titulo } : { dataBloco: tipo })
}

function transformarCitacao(citacao: NoMarkdown) {
  const paragrafo = citacao.children?.[0]
  const primeiroTexto = paragrafo?.type === 'paragraph' ? paragrafo.children?.[0] : undefined
  if (!paragrafo || primeiroTexto?.type !== 'text') return

  const marcador = detectarMarcador(primeiroTexto.value ?? '')
  if (!marcador) return

  const { tipo, comprimento } = marcador
  if (ehEstruturado(tipo)) {
    transformarEstruturado(citacao, tipo, comprimento)
    return
  }

  primeiroTexto.value = (primeiroTexto.value ?? '').slice(comprimento)

  if (ehAlertaDoArtigo(tipo)) {
    transformarAlerta(citacao, paragrafo, tipo)
    return
  }

  if (tipo === 'detalhes') {
    const titulo = retirarPrimeiraLinha(paragrafo)
    marcarNo(citacao, { dataBloco: 'detalhes', dataTitulo: titulo || 'Detalhes' })
  } else {
    primeiroTexto.value = primeiroTexto.value.replace(/^\s+/, '')
    marcarNo(citacao, { dataBloco: tipo })
  }

  if (paragrafoVazio(paragrafo)) citacao.children?.shift()
  if (tipo === 'passos') marcarPassos(citacao)
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

const INICIO_DE_FONTE = /^\s*fontes?\s*:/i

/** Texto que cita a origem do conteúdo (`Fonte:` ou `Fontes:`): vai para o rodapé, nunca para resumo. */
export function ehTextoDeFonte(texto: string | null | undefined): boolean {
  return Boolean(texto) && INICIO_DE_FONTE.test(texto ?? '')
}

/** Parágrafos da citação da fonte, ou `null` quando o bloco não é fonte. */
function paragrafosDeFonte(no: NoMarkdown): NoMarkdown[] | null {
  if (no.type === 'paragraph') return ehTextoDeFonte(textoPlano(no)) ? [no] : null
  if (no.type !== 'blockquote' || no.data?.hProperties?.dataBloco) return null

  const primeiro = no.children?.[0]
  if (primeiro?.type !== 'paragraph' || !ehTextoDeFonte(textoPlano(primeiro))) return null
  return no.children ?? []
}

/**
 * Plugin do remark: tira do fluxo o parágrafo ou a citação de primeiro nível que começa por
 * `Fonte:` e junta tudo num bloco `fonte` no fim do corpo. O leitor chega ao conteúdo primeiro.
 */
export function remarkFonteNoRodape() {
  return (arvore: NoMarkdown) => {
    const filhos = arvore.children ?? []
    const fontes: NoMarkdown[] = []
    const conteudo = filhos.filter((filho) => {
      const paragrafos = paragrafosDeFonte(filho)
      if (!paragrafos) return true
      fontes.push(...paragrafos)
      return false
    })

    if (fontes.length === 0) return

    const rodape: NoMarkdown = { type: 'blockquote', children: fontes }
    marcarNo(rodape, { dataBloco: 'fonte' })
    arvore.children = [...conteudo, rodape]
  }
}

function htmlParaTexto(no: NoMarkdown) {
  if (no.type === 'html') no.type = 'text'
  no.children?.forEach(htmlParaTexto)
}

/**
 * Plugin do remark: HTML cru vira texto literal. Aviso cita tag de XML sem crase (`<nfse_teste>`),
 * e o `skipHtml` apagaria o nome da tela sem aviso; como texto, o React escapa e a tag aparece.
 */
export function remarkHtmlComoTexto() {
  return (arvore: NoMarkdown) => {
    htmlParaTexto(arvore)
  }
}
