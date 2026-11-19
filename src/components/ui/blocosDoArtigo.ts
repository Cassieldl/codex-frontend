/**
 * Lógica dos blocos visuais do corpo do artigo. Fica fora do componente para ser testada sem
 * renderizar: o que decide se um trecho vira caixa, fluxo ou imagem mora aqui.
 */

export type TipoDeAlertaDoArtigo = 'dica' | 'atencao' | 'importante' | 'sucesso'

type TipoEstruturado = 'cartoes' | 'comparativo' | 'checklist' | 'conversao' | 'colunas'

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
  CONVERSAO: 'conversao',
  COLUNAS: 'colunas',
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
  depth?: number
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

/** `Destino | valor`, os dois preenchidos. Fora dessa forma, devolve `false`. */
function montarItemDeConversao(item: NoMarkdown): boolean {
  const paragrafo = item.children?.[0]
  if (item.children?.length !== 1 || paragrafo?.type !== 'paragraph') return false

  const trechos = dividirPorBarra(paragrafo.children ?? [])
  if (trechos.length !== 2 || trechos.some((trecho) => trecho.length === 0)) return false

  const [destino, valor] = trechos.map((trecho) => ({ type: 'paragraph', children: trecho }))
  marcarNo(destino, { dataParte: 'destinoConversao' })
  marcarNo(valor, { dataParte: 'valorConversao' })
  item.spread = true
  item.children = [destino, valor]
  marcarNo(item, { dataTipoItem: 'conversao' })
  return true
}

/** O código enviado na linha do marcador e uma lista `Destino | valor` com o que cada um recebe. */
function montarConversao(citacao: NoMarkdown): boolean {
  const [paragrafo, lista, ...resto] = citacao.children ?? []
  if (resto.length > 0 || paragrafo?.type !== 'paragraph') return false
  if (lista?.type !== 'list' || lista.ordered) return false

  const origem = textoPlano(paragrafo).trim()
  const itens = lista.children ?? []
  if (!origem || origem.includes('\n') || itens.length === 0) return false
  if (!itens.every(montarItemDeConversao)) return false

  marcarNo(lista, { dataTipoLista: 'conversao' })
  marcarNo(citacao, { dataTitulo: origem })
  citacao.children = [lista]
  return true
}

function ehTituloDeNivel(no: NoMarkdown | undefined, nivel: number): boolean {
  return no?.type === 'heading' && no.depth === nivel
}

/** Corta a sequência em seções que começam por título h3; `null` quando ela não abre com um. */
function dividirEmSecoes(nos: NoMarkdown[]): NoMarkdown[][] | null {
  if (!ehTituloDeNivel(nos[0], 3)) return null

  const secoes: NoMarkdown[][] = []
  for (const no of nos) {
    if (ehTituloDeNivel(no, 3)) secoes.push([no])
    else secoes[secoes.length - 1].push(no)
  }
  return secoes
}

/** Item cujo único conteúdo é um link. */
function ehItemSoComLink(item: NoMarkdown): boolean {
  const paragrafo = item.children?.[0]
  if (item.children?.length !== 1 || paragrafo?.type !== 'paragraph') return false
  const conteudo = (paragrafo.children ?? []).filter((filho) => !textoEmBranco(filho))
  return conteudo.length === 1 && conteudo[0].type === 'link'
}

/** Lista só de links, dentro do cartão, vira uma pilha de linhas clicáveis. */
function marcarListasDeLinks(nos: NoMarkdown[]) {
  for (const no of nos) {
    const itens = no.children ?? []
    if (no.type !== 'list' || no.ordered || itens.length === 0) continue
    if (!itens.every(ehItemSoComLink)) continue

    marcarNo(no, { dataTipoLista: 'links' })
    itens.forEach((item) => marcarNo(item, { dataTipoItem: 'link' }))
  }
}

/** Cada título h3 abre um cartão com o que vem até o próximo h3. Pelo menos dois cartões. */
function montarColunas(citacao: NoMarkdown): boolean {
  const secoes = dividirEmSecoes(citacao.children ?? [])
  if (!secoes || secoes.length < 2) return false

  const itens = secoes.map((secao) => {
    marcarListasDeLinks(secao)
    const item: NoMarkdown = { type: 'listItem', spread: true, children: secao }
    marcarNo(item, { dataTipoItem: 'cartaoLivre' })
    return item
  })

  const lista: NoMarkdown = { type: 'list', ordered: false, spread: true, children: itens }
  marcarNo(lista, { dataTipoLista: 'colunas' })
  citacao.children = [lista]
  return true
}

const MONTAGEM_ESTRUTURADA: Readonly<Record<TipoEstruturado, (citacao: NoMarkdown) => boolean>> = {
  cartoes: montarCartoes,
  comparativo: montarComparativo,
  checklist: montarChecklist,
  conversao: montarConversao,
  colunas: montarColunas,
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
  citacao.data = copia.data
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

export const MARCADOR_DO_SELETOR = /^\[!SELETOR\][ \t]*/

/** Primeiro texto da citação quando ela abre com `[!SELETOR]`; fora disso, `null`. */
function textoDoMarcadorDoSeletor(no: NoMarkdown): NoMarkdown | null {
  if (no.type !== 'blockquote') return null
  const paragrafo = no.children?.[0]
  const primeiroTexto = paragrafo?.type === 'paragraph' ? paragrafo.children?.[0] : undefined
  if (primeiroTexto?.type !== 'text') return null
  return MARCADOR_DO_SELETOR.test(primeiroTexto.value ?? '') ? primeiroTexto : null
}

/**
 * Monta o seletor: a citação guarda o rótulo e a dica, e cada seção h3 que vem depois dela, até o
 * próximo h2, vira um painel. Com menos de duas seções, nada muda e o marcador fica visível.
 */
function montarSeletor(citacao: NoMarkdown, seguintes: NoMarkdown[]): boolean {
  const secoes = dividirEmSecoes(seguintes)
  const primeiroTexto = textoDoMarcadorDoSeletor(citacao)
  if (!secoes || secoes.length < 2 || !primeiroTexto) return false

  const paragrafo = citacao.children?.[0] as NoMarkdown
  primeiroTexto.value = (primeiroTexto.value ?? '').replace(MARCADOR_DO_SELETOR, '')
  const rotulo = retirarPrimeiraLinha(paragrafo)
  if (paragrafoVazio(paragrafo)) citacao.children?.shift()

  const dica = citacao.children ?? []
  const paineis = secoes.map((secao, indice) => {
    const painel: NoMarkdown = { type: 'blockquote', children: secao }
    marcarNo(painel, {
      dataBloco: 'painelDoSeletor',
      dataIndice: indice,
      dataTitulo: textoPlano(secao[0]).trim(),
    })
    return painel
  })

  const blocoDaDica: NoMarkdown = { type: 'blockquote', children: dica }
  marcarNo(blocoDaDica, { dataBloco: 'dicaDoSeletor' })
  citacao.children = dica.length > 0 ? [blocoDaDica, ...paineis] : paineis
  marcarNo(citacao, { dataBloco: 'seletor', dataTitulo: rotulo || 'Escolha' })
  return true
}

/** Fim da região do seletor: o próximo h2 (ou h1) ou o fim do corpo. */
function fimDaRegiao(filhos: NoMarkdown[], inicio: number): number {
  let fim = inicio
  while (fim < filhos.length) {
    const no = filhos[fim]
    if (no.type === 'heading' && (no.depth ?? 0) <= 2) break
    fim++
  }
  return fim
}

function agruparSeletores(arvore: NoMarkdown) {
  const filhos = arvore.children ?? []
  const agrupados: NoMarkdown[] = []

  for (let indice = 0; indice < filhos.length; indice++) {
    const no = filhos[indice]
    agrupados.push(no)
    if (!textoDoMarcadorDoSeletor(no)) continue

    const fim = fimDaRegiao(filhos, indice + 1)
    if (montarSeletor(no, filhos.slice(indice + 1, fim))) indice = fim - 1
  }

  arvore.children = agrupados
}

function ehAlertaMarcado(no: NoMarkdown | undefined): boolean {
  if (no?.type !== 'blockquote') return false
  const paragrafo = no.children?.[0]
  const primeiroTexto = paragrafo?.type === 'paragraph' ? paragrafo.children?.[0] : undefined
  const marcador =
    primeiroTexto?.type === 'text' ? detectarMarcador(primeiroTexto.value ?? '') : null
  return marcador !== null && ehAlertaDoArtigo(marcador.tipo)
}

/** Título h3 seguido direto de tabela forma um grupo; um alerta logo depois entra junto. */
function agruparTabelas(arvore: NoMarkdown) {
  const filhos = arvore.children ?? []
  const agrupados: NoMarkdown[] = []

  for (let indice = 0; indice < filhos.length; indice++) {
    const no = filhos[indice]
    if (!ehTituloDeNivel(no, 3) || filhos[indice + 1]?.type !== 'table') {
      agrupados.push(no)
      continue
    }

    const comAlerta = ehAlertaMarcado(filhos[indice + 2])
    const quantidade = comAlerta ? 3 : 2
    const grupo: NoMarkdown = {
      type: 'blockquote',
      children: filhos.slice(indice, indice + quantidade),
    }
    marcarNo(grupo, { dataBloco: 'grupoDeTabela' })
    agrupados.push(grupo)
    indice += quantidade - 1
  }

  arvore.children = agrupados
}

/**
 * Plugin do remark: reconhece o marcador `[!TIPO]` na primeira linha do blockquote, remove-o do
 * texto exibido e anota o tipo como propriedade do elemento. Quem desenha o bloco é o componente
 * do `blockquote` em `ConteudoArtigo`; o remark-gfm não entende os alertas do GitHub. Os blocos que
 * juntam seções vizinhas (seletor e grupo de tabela) só valem no primeiro nível do corpo.
 */
export function remarkBlocosDoArtigo() {
  return (arvore: NoMarkdown) => {
    agruparSeletores(arvore)
    agruparTabelas(arvore)
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
