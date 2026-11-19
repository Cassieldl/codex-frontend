import clsx from 'clsx'
import { ExternalLink } from 'lucide-react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'

export interface LinkExternoProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'target' | 'rel' | 'children'
> {
  href: string
  children: ReactNode
  /** Tamanho e espaçamento do ícone; o padrão acompanha a fonte do texto. */
  classeDoIcone?: string
}

/** Link que sai do Codex: abre em nova aba, mostra o ícone de saída e avisa o leitor de tela. */
export function LinkExterno({
  href,
  children,
  className,
  classeDoIcone = 'size-[1em]',
  ...props
}: LinkExternoProps) {
  // O espaço fica fora do `sr-only`: dentro dele, o nome acessível cola o aviso no texto.
  return (
    <a {...props} href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}{' '}
      <ExternalLink
        className={clsx('inline-block shrink-0 align-[-0.125em]', classeDoIcone)}
        aria-hidden="true"
      />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  )
}
