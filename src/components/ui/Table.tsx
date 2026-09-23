import clsx from 'clsx'
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'

export interface TableRootProps {
  children: ReactNode
  className?: string
}

export interface TableRootComRotuloProps extends TableRootProps {
  /** Rótulo da região rolável, anunciado quando o foco de teclado entra nela. */
  rotulo?: string
}

/** Primitivos de tabela densa — a tabela específica (ex.: campos de layout) monta em cima destes. */
export function TableRoot({ children, className, rotulo }: TableRootComRotuloProps) {
  return (
    // A rolagem horizontal só é alcançável por teclado se o contêiner receber
    // foco (WCAG 2.1.1) — o `role="group"` é o que dá sentido ao `tabIndex`.
    <div
      tabIndex={0}
      role="group"
      aria-label={rotulo ?? 'Tabela com rolagem horizontal'}
      className="overflow-x-auto rounded-[var(--radius-card)] border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
    >
      <table className={clsx('w-full border-collapse text-left', className)}>{children}</table>
    </div>
  )
}

export function TableHeader({ children, className }: TableRootProps) {
  return (
    <thead
      className={clsx(
        'sticky top-0 z-10 rounded-t-[5px] border-b border-border bg-white',
        className,
      )}
    >
      {children}
    </thead>
  )
}

export interface TableRowProps {
  children: ReactNode
  className?: string
  id?: string
}

export function TableRow({ children, className, id }: TableRowProps) {
  return (
    <tr id={id} className={clsx('h-[38px] border-b border-line last:border-b-0', className)}>
      {children}
    </tr>
  )
}

export interface TableCellProps extends Omit<
  TdHTMLAttributes<HTMLTableCellElement> & ThHTMLAttributes<HTMLTableCellElement>,
  'className'
> {
  children?: ReactNode
  className?: string
  /** Renderiza `<th scope="col">` no lugar de `<td>` — uso em cabeçalhos de coluna. */
  header?: boolean
}

export function TableCell({ children, className, header = false, ...props }: TableCellProps) {
  const Tag = header ? 'th' : 'td'

  return (
    <Tag
      scope={header ? 'col' : undefined}
      className={clsx(
        header
          ? 'px-5 text-center text-xs leading-5 font-medium text-ink'
          : 'px-5 py-[9px] text-xs leading-5 text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}
