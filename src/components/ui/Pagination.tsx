import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useId } from 'react'

export interface PaginationProps {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

const PAGE_SIZE_OPTIONS_PADRAO = [25, 50, 100, 200]

/** Calcula quais números de página exibir, com `null` marcando reticências. */
function calcularPaginasVisiveis(pagina: number, totalPaginas: number): (number | null)[] {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, indice) => indice + 1)
  }

  const paginas = new Set<number>([1, totalPaginas, pagina])
  if (pagina - 1 >= 1) paginas.add(pagina - 1)
  if (pagina + 1 <= totalPaginas) paginas.add(pagina + 1)

  const ordenadas = Array.from(paginas).sort((a, b) => a - b)
  const resultado: (number | null)[] = []

  ordenadas.forEach((numeroPagina, indice) => {
    if (indice > 0) {
      const anterior = ordenadas[indice - 1]
      if (anterior !== undefined && numeroPagina - anterior > 1) {
        resultado.push(null)
      }
    }
    resultado.push(numeroPagina)
  })

  return resultado
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  pageSizeOptions = PAGE_SIZE_OPTIONS_PADRAO,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const seletorId = useId()
  const paginasVisiveis = calcularPaginasVisiveis(page, totalPages)
  const naPrimeiraPagina = page <= 1
  const naUltimaPagina = page >= totalPages

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 text-xs text-muted">
        <label htmlFor={seletorId}>Itens por página</label>
        <select
          id={seletorId}
          value={pageSize}
          onChange={(evento) => onPageSizeChange(Number(evento.target.value))}
          className="h-8 rounded-[var(--radius-control)] border border-border-control px-2 text-xs"
        >
          {pageSizeOptions.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
        <span>{totalCount} registros</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={naPrimeiraPagina}
          onClick={() => onPageChange(page - 1)}
          className="flex size-6 items-center justify-center rounded-[var(--radius-control)] text-xs font-bold text-ink hover:shadow-hover disabled:cursor-not-allowed disabled:text-muted disabled:hover:shadow-none"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>

        {paginasVisiveis.map((numeroPagina, indice) =>
          numeroPagina === null ? (
            <span
              key={`reticencias-${indice}`}
              aria-hidden="true"
              className="px-1 text-xs text-muted"
            >
              …
            </span>
          ) : (
            <button
              key={numeroPagina}
              type="button"
              aria-label={`Página ${numeroPagina}`}
              aria-current={numeroPagina === page ? 'page' : undefined}
              onClick={() => onPageChange(numeroPagina)}
              className={clsx(
                'flex size-6 items-center justify-center rounded-[var(--radius-control)] text-xs font-bold hover:shadow-hover',
                numeroPagina === page ? 'bg-primary text-white' : 'text-ink',
              )}
            >
              {numeroPagina}
            </button>
          ),
        )}

        <button
          type="button"
          aria-label="Próxima página"
          disabled={naUltimaPagina}
          onClick={() => onPageChange(page + 1)}
          className="flex size-6 items-center justify-center rounded-[var(--radius-control)] text-xs font-bold text-ink hover:shadow-hover disabled:cursor-not-allowed disabled:text-muted disabled:hover:shadow-none"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
