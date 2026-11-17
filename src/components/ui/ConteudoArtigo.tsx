import clsx from 'clsx'
import { ArrowRight, CircleCheck } from 'lucide-react'
import type { AnchorHTMLAttributes, ComponentProps, HTMLAttributes, ReactNode } from 'react'
import { Children, isValidElement } from 'react'
import Markdown from 'react-markdown'
import type { Components, ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { caminhoInternoSeguro } from '../../utils/caminhoInternoSeguro'
import { AlertaMigrate } from './AlertaMigrate'
import type { TipoAlerta } from './AlertaMigrate'
import { BlocoRecolhivel } from './BlocoRecolhivel'
import { CaixaDestaque } from './CaixaDestaque'
import { FluxoDeEtapas } from './FluxoDeEtapas'
import { ImagemDoArtigo } from './ImagemDoArtigo'
import { CartaoDePasso, ListaDePassos } from './PassoAPasso'
import { TableRoot } from './Table'
import { ValorSimNao } from './ValorSimNao'
import {
  caminhoDeImagemSeguro,
  ehAlertaDoArtigo,
  interpretarFluxo,
  reconhecerSimNao,
  remarkBlocosDoArtigo,
  remarkFonteNoRodape,
  remarkHtmlComoTexto,
} from './blocosDoArtigo'
import type { TipoDeAlertaDoArtigo } from './blocosDoArtigo'
import { gerarAncoraSecao } from './secoesDoArtigo'

/**
 * Elementos permitidos no corpo do artigo (`arquitetura.md` E9 +
 * thead/tbody/tr/th/td, exigidos por `remark-gfm` para tabela renderizar --
 * sem eles a tabela vira texto truncado no elemento pai permitido mais
 * proximo). `h1` fica fora de proposito: o titulo do artigo ja e o unico
 * `<h1>` da pagina -- um `h1` no corpo quebraria a hierarquia de
 * heading/landmark (WCAG 2.1 AA -- 1.3.1). `img` entra, mas so vira `<img>`
 * quando o caminho passa por `caminhoDeImagemSeguro`.
 */
const ELEMENTOS_PERMITIDOS = [
  'h2',
  'h3',
  'p',
  'ul',
  'ol',
  'li',
  'code',
  'pre',
  'a',
  'strong',
  'em',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
]

export type VarianteConteudo = 'artigo' | 'aviso'

const PLUGINS_DO_REMARK = {
  artigo: [remarkGfm, remarkBlocosDoArtigo, remarkFonteNoRodape],
  aviso: [remarkGfm, remarkBlocosDoArtigo, remarkHtmlComoTexto],
} satisfies Record<VarianteConteudo, unknown[]>

// Mora aqui, e não em quem usa, para a página pública e o preview do editor ficarem iguais. O
// `min-w-0` deixa a tabela rolar dentro da própria região em vez de alargar a página.
const ESTILO_COMUM =
  'flex min-w-0 flex-col text-ink [&_a]:text-primary-medium [&_a]:underline [&_a]:[overflow-wrap:anywhere] [&_code]:font-mono [&_code]:text-sm [&_h2]:scroll-mt-6 [&_h2]:text-subtitulo [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:scroll-mt-6 [&_h3]:text-card-titulo [&_h3]:font-medium [&_h3]:text-ink [&_pre]:overflow-x-auto [&_pre]:rounded-[var(--radius-control)] [&_pre]:bg-surface-disabled [&_pre]:p-3'

const ESTILO_POR_VARIANTE: Record<VarianteConteudo, string> = {
  artigo: 'gap-4 text-corpo',
  aviso: 'gap-2 text-sm',
}

/** Concatena o texto de um node React, recursivamente -- usado só para gerar o `id` do heading. */
function extrairTexto(children: ReactNode): string {
  return Children.toArray(children)
    .map((filho) => {
      if (typeof filho === 'string') return filho
      if (typeof filho === 'number') return String(filho)
      if (isValidElement<{ children?: ReactNode }>(filho)) return extrairTexto(filho.props.children)
      return ''
    })
    .join('')
}

type NoDoHtml = NonNullable<ExtraProps['node']>

/** Texto de um elemento da árvore HTML gerada pelo Markdown, antes de virar React. */
function textoDoNo(no: NoDoHtml): string {
  return no.children
    .map((filho) => {
      if (filho.type === 'text') return filho.value
      if (filho.type === 'element') return textoDoNo(filho)
      return ''
    })
    .join('')
}

function criarTituloDeSecao(Tag: 'h2' | 'h3') {
  function TituloDeSecao({ children, ...props }: HTMLAttributes<HTMLHeadingElement> & ExtraProps) {
    const id = gerarAncoraSecao(extrairTexto(children))
    return (
      <Tag id={id} {...props}>
        {children}
      </Tag>
    )
  }
  TituloDeSecao.displayName = `TituloDeSecao(${Tag})`
  return TituloDeSecao
}

/**
 * Link do corpo do artigo (§3.2): caminho interno vira `<Link>`-like `<a>`
 * relativo de propósito (nunca precisa de `target`); link externo `http(s)`
 * ganha `target="_blank" rel="noopener noreferrer"` (`security.md` A05);
 * qualquer outro esquema (`javascript:`, `data:`, etc.) não vira `<a>` --
 * mesmo filtro de `caminhoInternoSeguro` já usado pela busca, aplicado aqui
 * a conteúdo editorial em vez de dado estruturado da API.
 */
function LinkDoCorpo({
  href,
  children,
  node: _node,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & ExtraProps) {
  const caminhoInterno = caminhoInternoSeguro(href)
  if (caminhoInterno) {
    return (
      <a href={caminhoInterno} {...props}>
        {children}
      </a>
    )
  }

  const externoSeguro = href?.startsWith('http://') || href?.startsWith('https://')
  if (externoSeguro) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
  }

  return <>{children}</>
}

const ALERTA_POR_BLOCO: Record<TipoDeAlertaDoArtigo, { tipo: TipoAlerta; rotulo: string }> = {
  dica: { tipo: 'informacao', rotulo: 'Dica' },
  importante: { tipo: 'alerta', rotulo: 'Importante' },
  atencao: { tipo: 'erro', rotulo: 'Atenção' },
  sucesso: { tipo: 'sucesso', rotulo: 'Sucesso' },
}

/** O tipo vem do marcador `[!TIPO]`, anotado por `remarkBlocosDoArtigo`; sem ele, citação comum. */
function CitacaoDoCorpo({ children, node, ...props }: ComponentProps<'blockquote'> & ExtraProps) {
  const tipo = node?.properties.dataBloco

  if (ehAlertaDoArtigo(tipo)) {
    const { tipo: tipoAlerta, rotulo } = ALERTA_POR_BLOCO[tipo]
    const titulo = node?.properties.dataTitulo
    return (
      <AlertaMigrate tipo={tipoAlerta} titulo={typeof titulo === 'string' ? titulo : rotulo}>
        {children}
      </AlertaMigrate>
    )
  }

  if (tipo === 'resumo') return <CaixaDestaque>{children}</CaixaDestaque>

  if (tipo === 'cartoes' || tipo === 'comparativo' || tipo === 'checklist') {
    return <div data-bloco={tipo}>{children}</div>
  }

  if (tipo === 'detalhes') {
    const titulo = node?.properties.dataTitulo
    return (
      <BlocoRecolhivel titulo={typeof titulo === 'string' ? titulo : 'Detalhes'}>
        {children}
      </BlocoRecolhivel>
    )
  }

  if (tipo === 'passos') return <div className="flex flex-col gap-3">{children}</div>

  if (tipo === 'fonte') {
    return (
      <footer className="mt-4 flex flex-col gap-1 border-t border-line pt-4 text-sm text-muted">
        {children}
      </footer>
    )
  }

  return (
    <blockquote className="border-l-4 border-line pl-4" {...props}>
      {children}
    </blockquote>
  )
}

function ListaNumerada({ children, node, start, ...props }: ComponentProps<'ol'> & ExtraProps) {
  if (node?.properties.dataPassos) return <ListaDePassos inicio={start}>{children}</ListaDePassos>

  return (
    <ol start={start} className="ml-5 flex list-decimal flex-col gap-1" {...props}>
      {children}
    </ol>
  )
}

const CLASSE_POR_TIPO_DE_LISTA: Record<string, string> = {
  cartoes: 'grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
  comparativo: 'grid list-none grid-cols-1 gap-4 md:grid-cols-2',
  checklist: 'flex list-none flex-col gap-2',
}

function ListaComMarcadores({ children, node }: ComponentProps<'ul'> & ExtraProps) {
  const tipo = node?.properties.dataTipoLista
  const classe = typeof tipo === 'string' ? CLASSE_POR_TIPO_DE_LISTA[tipo] : undefined

  return <ul className={classe ?? 'ml-5 flex list-disc flex-col gap-1'}>{children}</ul>
}

// O link da ação se estica sobre o cartão inteiro: um só alvo de clique, sem link dentro de link.
const CLASSE_DO_CARTAO =
  'relative flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-white p-5 transition-shadow has-[a]:hover:shadow-hover has-[a:focus-visible]:shadow-hover'

function ItemDeLista({ children, node, ...props }: ComponentProps<'li'> & ExtraProps) {
  const numero = node?.properties.dataNumeroPasso
  if (typeof numero === 'number') return <CartaoDePasso numero={numero}>{children}</CartaoDePasso>

  const tipo = node?.properties.dataTipoItem
  if (tipo === 'cartao') return <li className={CLASSE_DO_CARTAO}>{children}</li>

  if (tipo === 'coluna') {
    return (
      <li className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line border-t-4 border-t-primary-light bg-white p-5">
        {children}
      </li>
    )
  }

  if (tipo === 'checklist') {
    return (
      <li className="flex items-start gap-2">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <div className="min-w-0 flex-1">{children}</div>
      </li>
    )
  }

  return <li {...props}>{children}</li>
}

const CLASSE_POR_PARTE: Record<string, string> = {
  tituloCartao: 'text-card-titulo font-semibold text-primary',
  textoCartao: 'text-sm text-muted',
  tituloColuna: 'text-card-titulo font-semibold text-primary',
  acaoCartao:
    "mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold [&_a]:no-underline! [&_a]:after:absolute [&_a]:after:inset-0 [&_a]:after:rounded-[var(--radius-card)] [&_a]:after:content-['']",
}

/** Parágrafo com imagem vira `<div>`: `<figure>` dentro de `<p>` é HTML inválido. */
function Paragrafo({ children, node, ...props }: ComponentProps<'p'> & ExtraProps) {
  const temImagem = node?.children.some(
    (filho) => filho.type === 'element' && filho.tagName === 'img',
  )
  if (temImagem) return <div>{children}</div>

  const parte = node?.properties.dataParte
  if (typeof parte === 'string' && CLASSE_POR_PARTE[parte]) {
    return (
      <p className={CLASSE_POR_PARTE[parte]}>
        {children}
        {parte === 'acaoCartao' && (
          <ArrowRight className="size-4 shrink-0 text-primary-medium" aria-hidden="true" />
        )}
      </p>
    )
  }

  return <p {...props}>{children}</p>
}

/** Fora de `/imagens/`, a imagem vira só o texto alternativo. */
function ImagemDoCorpo({ src, alt, title }: ComponentProps<'img'> & ExtraProps) {
  const caminhoSeguro = caminhoDeImagemSeguro(typeof src === 'string' ? src : undefined)
  if (!caminhoSeguro) return alt ? <span>{alt}</span> : null

  return <ImagemDoArtigo src={caminhoSeguro} alt={alt ?? ''} legenda={title} />
}

/** Bloco cercado com a linguagem `fluxo` vira o diagrama; qualquer outro continua código. */
function BlocoDeCodigo({ children, node, ...props }: ComponentProps<'pre'> & ExtraProps) {
  const codigo = node?.children[0]

  if (codigo?.type === 'element' && temClasse(codigo, 'language-fluxo')) {
    const etapas = interpretarFluxo(textoDoNo(codigo))
    if (etapas.length > 0) return <FluxoDeEtapas etapas={etapas} />
  }

  return <pre {...props}>{children}</pre>
}

function temClasse(no: NoDoHtml, classe: string): boolean {
  const classes = no.properties.className
  return Array.isArray(classes) && classes.includes(classe)
}

function elementosFilhos(no: NoDoHtml, tagName: string): NoDoHtml[] {
  return no.children.filter(
    (filho): filho is NoDoHtml => filho.type === 'element' && filho.tagName === tagName,
  )
}

/** Nome da região rolável a partir do cabeçalho: duas tabelas no mesmo artigo não ficam com o mesmo nome. */
function rotuloDaTabela(tabela: NoDoHtml | undefined): string {
  const cabecalho = tabela ? elementosFilhos(tabela, 'thead')[0] : undefined
  const linha = cabecalho ? elementosFilhos(cabecalho, 'tr')[0] : undefined
  const colunas = linha
    ? elementosFilhos(linha, 'th').map((celula) => textoDoNo(celula).trim())
    : []
  const nomes = colunas.filter(Boolean)

  return nomes.length > 0 ? `Tabela: ${nomes.join(', ')}` : 'Tabela'
}

// Rótulo até este tamanho cabe numa linha ao lado da descrição em 1440 px.
const LIMITE_DO_ROTULO_CURTO = 36

/** Primeira coluna de rótulos curtos não quebra: "Atualização de Status" lido em duas linhas some na tabela. */
function primeiraColunaCurta(tabela: NoDoHtml | undefined): boolean {
  if (!tabela) return false

  const linhas = ['thead', 'tbody']
    .flatMap((secao) => elementosFilhos(tabela, secao))
    .flatMap((secao) => elementosFilhos(secao, 'tr'))
  const rotulos = linhas
    .map((linha) => linha.children.find((filho): filho is NoDoHtml => filho.type === 'element'))
    .map((celula) => (celula ? textoDoNo(celula).trim() : ''))

  return rotulos.length > 0 && rotulos.every((rotulo) => rotulo.length <= LIMITE_DO_ROTULO_CURTO)
}

/**
 * Tabela larga rola dentro da própria região, alcançável por teclado; a página nunca rola de lado.
 * A largura mínima faz o celular rolar a tabela em vez de espremer a descrição numa coluna estreita.
 */
function TabelaDoCorpo({ children, node }: ComponentProps<'table'> & ExtraProps) {
  return (
    <TableRoot
      rotulo={rotuloDaTabela(node)}
      className={clsx(
        'min-w-[32rem] bg-white text-sm leading-relaxed text-ink',
        primeiraColunaCurta(node) &&
          '[&_td:first-child]:whitespace-nowrap [&_th:first-child]:whitespace-nowrap',
      )}
    >
      {children}
    </TableRoot>
  )
}

const CLASSE_DA_CELULA = 'px-4 py-3 text-left align-top'

function CabecalhoDaTabela({ children, node: _node, ...props }: ComponentProps<'th'> & ExtraProps) {
  return (
    <th
      className={`${CLASSE_DA_CELULA} border-b border-border bg-surface-hover font-semibold text-primary`}
      {...props}
    >
      {children}
    </th>
  )
}

function CelulaDaTabela({ children, node, ...props }: ComponentProps<'td'> & ExtraProps) {
  const valor = node ? reconhecerSimNao(textoDoNo(node)) : null

  return (
    <td className={`${CLASSE_DA_CELULA} border-t border-line`} {...props}>
      {valor ? <ValorSimNao valor={valor} /> : children}
    </td>
  )
}

const COMPONENTES: Components = {
  a: LinkDoCorpo,
  h2: criarTituloDeSecao('h2'),
  h3: criarTituloDeSecao('h3'),
  blockquote: CitacaoDoCorpo,
  ol: ListaNumerada,
  ul: ListaComMarcadores,
  li: ItemDeLista,
  p: Paragrafo,
  img: ImagemDoCorpo,
  pre: BlocoDeCodigo,
  table: TabelaDoCorpo,
  th: CabecalhoDaTabela,
  td: CelulaDaTabela,
}

export interface ConteudoArtigoProps {
  /** Markdown restrito, cru -- nunca HTML (D11/E9). */
  corpo: string
  /** `aviso` usa texto menor e mostra HTML cru como texto literal, em vez de descartá-lo. */
  variante?: VarianteConteudo
  className?: string
}

/**
 * Renderizador de Markdown do corpo de artigo/preview (U-4) e do corpo do aviso. HTML bruto
 * nunca é interpretado (`skipHtml`, sem `rehype-raw`) e só a allowlist acima
 * vira elemento -- o vetor de XSS fecha por configuração, nunca por
 * confiança no editor. Nunca usa `dangerouslySetInnerHTML`.
 */
export function ConteudoArtigo({ corpo, variante = 'artigo', className }: ConteudoArtigoProps) {
  return (
    <div className={clsx(ESTILO_COMUM, ESTILO_POR_VARIANTE[variante], className)}>
      <Markdown
        remarkPlugins={PLUGINS_DO_REMARK[variante]}
        allowedElements={ELEMENTOS_PERMITIDOS}
        unwrapDisallowed={false}
        skipHtml
        components={COMPONENTES}
      >
        {corpo}
      </Markdown>
    </div>
  )
}
