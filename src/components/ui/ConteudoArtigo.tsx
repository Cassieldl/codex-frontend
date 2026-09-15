import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Children, isValidElement } from 'react'
import Markdown from 'react-markdown'
import type { Components, ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { caminhoInternoSeguro } from '../../utils/caminhoInternoSeguro'
import { gerarAncoraSecao } from './SumarioArtigo'

/**
 * Elementos permitidos no corpo do artigo (`arquitetura.md` E9 +
 * thead/tbody/tr/th/td, exigidos por `remark-gfm` para tabela renderizar --
 * sem eles a tabela vira texto truncado no elemento pai permitido mais
 * proximo). `h1` fica fora de proposito: o titulo do artigo ja e o unico
 * `<h1>` da pagina -- um `h1` no corpo quebraria a hierarquia de
 * heading/landmark (WCAG 2.1 AA -- 1.3.1).
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
]

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

const COMPONENTES: Components = {
  a: LinkDoCorpo,
  h2: criarTituloDeSecao('h2'),
  h3: criarTituloDeSecao('h3'),
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
    <div className={className}>
      <Markdown
        remarkPlugins={[remarkGfm]}
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
