import clsx from 'clsx'
import type { AnchorHTMLAttributes, ComponentProps, HTMLAttributes, ReactNode } from 'react'
import { Children, isValidElement } from 'react'
import Markdown from 'react-markdown'
import type { Components, ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { caminhoInternoSeguro } from '../../utils/caminhoInternoSeguro'
import { BlocoRecolhivel } from './BlocoRecolhivel'
import { CaixaDestaque } from './CaixaDestaque'
import { FluxoDeEtapas } from './FluxoDeEtapas'
import { ImagemDoArtigo } from './ImagemDoArtigo'
import { CartaoDePasso, ListaDePassos } from './PassoAPasso'
import { TableRoot } from './Table'
import { ValorSimNao } from './ValorSimNao'
import {
  caminhoDeImagemSeguro,
  ehTipoDeCaixa,
  interpretarFluxo,
  reconhecerSimNao,
  remarkBlocosDoArtigo,
} from './blocosDoArtigo'
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

const PLUGINS_DO_REMARK = [remarkGfm, remarkBlocosDoArtigo]

// Mora aqui, e não em quem usa, para a página pública e o preview do editor ficarem iguais. O
// `min-w-0` deixa a tabela rolar dentro da própria região em vez de alargar a página.
const ESTILO_DO_CORPO =
  'flex min-w-0 flex-col gap-4 text-corpo text-ink/80 [&_a]:text-primary-medium [&_a]:underline [&_a]:[overflow-wrap:anywhere] [&_code]:font-mono [&_code]:text-sm [&_h2]:text-subtitulo [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:text-card-titulo [&_h3]:font-medium [&_h3]:text-ink [&_pre]:overflow-x-auto [&_pre]:rounded-[var(--radius-control)] [&_pre]:bg-surface-disabled [&_pre]:p-3'

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

/** O tipo vem do marcador `[!TIPO]`, anotado por `remarkBlocosDoArtigo`; sem ele, citação comum. */
function CitacaoDoCorpo({ children, node, ...props }: ComponentProps<'blockquote'> & ExtraProps) {
  const tipo = node?.properties.dataBloco

  if (ehTipoDeCaixa(tipo)) return <CaixaDestaque tipo={tipo}>{children}</CaixaDestaque>

  if (tipo === 'detalhes') {
    const titulo = node?.properties.dataTitulo
    return (
      <BlocoRecolhivel titulo={typeof titulo === 'string' ? titulo : 'Detalhes'}>
        {children}
      </BlocoRecolhivel>
    )
  }

  if (tipo === 'passos') return <div className="flex flex-col gap-3">{children}</div>

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

function ListaComMarcadores({
  children,
  node: _node,
  ...props
}: ComponentProps<'ul'> & ExtraProps) {
  return (
    <ul className="ml-5 flex list-disc flex-col gap-1" {...props}>
      {children}
    </ul>
  )
}

function ItemDeLista({ children, node, ...props }: ComponentProps<'li'> & ExtraProps) {
  const numero = node?.properties.dataNumeroPasso
  if (typeof numero === 'number') return <CartaoDePasso numero={numero}>{children}</CartaoDePasso>

  return <li {...props}>{children}</li>
}

/** Parágrafo com imagem vira `<div>`: `<figure>` dentro de `<p>` é HTML inválido. */
function Paragrafo({ children, node, ...props }: ComponentProps<'p'> & ExtraProps) {
  const temImagem = node?.children.some(
    (filho) => filho.type === 'element' && filho.tagName === 'img',
  )
  if (temImagem) return <div>{children}</div>

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

/** Tabela larga rola dentro da própria região, alcançável por teclado; a página nunca rola de lado. */
function TabelaDoCorpo({ children, node }: ComponentProps<'table'> & ExtraProps) {
  return (
    <TableRoot rotulo={rotuloDaTabela(node)} className="text-sm text-ink">
      {children}
    </TableRoot>
  )
}

const CLASSE_DA_CELULA = 'px-3 py-2 text-left align-top'

function CabecalhoDaTabela({ children, node: _node, ...props }: ComponentProps<'th'> & ExtraProps) {
  return (
    <th
      className={`${CLASSE_DA_CELULA} border-b border-border bg-surface-hover font-semibold`}
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
  className?: string
}

/**
 * Renderizador de Markdown do corpo de artigo/preview (U-4). HTML bruto
 * nunca é interpretado (`skipHtml`, sem `rehype-raw`) e só a allowlist acima
 * vira elemento -- o vetor de XSS fecha por configuração, nunca por
 * confiança no editor. Nunca usa `dangerouslySetInnerHTML`.
 */
export function ConteudoArtigo({ corpo, className }: ConteudoArtigoProps) {
  return (
    <div className={clsx(ESTILO_DO_CORPO, className)}>
      <Markdown
        remarkPlugins={PLUGINS_DO_REMARK}
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
