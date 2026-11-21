import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import type { OrdenacaoDeTabela } from './ordenacaoDeTabela'

export interface TableRootProps {
  children: ReactNode
  className?: string
}

export interface TableRootComRotuloProps extends TableRootProps {
  /** Nome da região, dizendo o que a tabela lista: duas regiões com o mesmo nome confundem o leitor de tela. */
  rotulo: string
}

/** Primitivos de tabela densa: a tabela específica (ex.: campos de layout) monta em cima destes. */
export function TableRoot({ children, className, rotulo }: TableRootComRotuloProps) {
  return (
    // O foco no contêiner deixa a rolagem horizontal alcançável por teclado (WCAG 2.1.1).
    <div
      tabIndex={0}
      role="region"
      aria-label={rotulo}
      className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover"
    >
      <table className={cn('w-full border-collapse text-left', className)}>{children}</table>
    </div>
  )
}

export function TableHeader({ children, className }: TableRootProps) {
  return (
    <thead
      className={cn('sticky top-0 z-10 rounded-t-[5px] border-b border-border bg-white', className)}
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
    <tr id={id} className={cn('h-[38px] border-b border-border last:border-b-0', className)}>
      {children}
    </tr>
  )
}

/** Texto à esquerda; número e ações à direita. Cabeçalho e célula da coluna usam o mesmo valor. */
export type AlinhamentoDaColuna = 'esquerda' | 'direita'

const CLASSE_DO_ALINHAMENTO: Record<AlinhamentoDaColuna, string> = {
  esquerda: 'text-left',
  direita: 'text-right',
}

const CLASSE_DO_CABECALHO = 'px-5 text-xs leading-5 font-medium text-ink'

export interface TableCellProps extends Omit<
  TdHTMLAttributes<HTMLTableCellElement> & ThHTMLAttributes<HTMLTableCellElement>,
  'className'
> {
  children?: ReactNode
  className?: string
  /** Renderiza `<th scope="col">` no lugar de `<td>`, para cabeçalhos de coluna. */
  header?: boolean
  alinhamento?: AlinhamentoDaColuna
}

export function TableCell({
  children,
  className,
  header = false,
  alinhamento = 'esquerda',
  ...props
}: TableCellProps) {
  const Tag = header ? 'th' : 'td'

  return (
    <Tag
      scope={header ? 'col' : undefined}
      className={cn(
        header ? CLASSE_DO_CABECALHO : 'px-5 py-[9px] text-xs leading-5 text-ink',
        CLASSE_DO_ALINHAMENTO[alinhamento],
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

export interface TableSortableHeaderProps<Campo extends string> {
  children: ReactNode
  campo: Campo
  ordenacao: OrdenacaoDeTabela<Campo> | null
  onOrdenar: (campo: Campo) => void
  alinhamento?: AlinhamentoDaColuna
  className?: string
}

/** Cabeçalho que ordena a coluna: o `aria-sort` fica no `<th>`, o clique num botão dentro dele. */
export function TableSortableHeader<Campo extends string>({
  children,
  campo,
  ordenacao,
  onOrdenar,
  alinhamento = 'esquerda',
  className,
}: TableSortableHeaderProps<Campo>) {
  const direcao = ordenacao?.sortBy === campo ? ordenacao.sortDirection : null
  const ariaSort = direcao === 'asc' ? 'ascending' : direcao === 'desc' ? 'descending' : 'none'
  const Icone = direcao === 'asc' ? ArrowUp : direcao === 'desc' ? ArrowDown : ChevronsUpDown

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(CLASSE_DO_CABECALHO, CLASSE_DO_ALINHAMENTO[alinhamento], className)}
    >
      <button
        type="button"
        onClick={() => onOrdenar(campo)}
        className={cn(
          '-mx-1 inline-flex items-center gap-1 rounded px-1 py-1.5 font-medium hover:shadow-hover',
          alinhamento === 'direita' && 'flex-row-reverse',
        )}
      >
        {children}
        <Icone
          className={cn('size-3.5 shrink-0', direcao ? 'text-ink' : 'text-muted')}
          aria-hidden="true"
        />
      </button>
    </th>
  )
}
