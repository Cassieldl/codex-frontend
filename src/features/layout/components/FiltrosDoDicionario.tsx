import clsx from 'clsx'
import { useId } from 'react'
import type { RefObject } from 'react'

export interface FiltrosDoDicionarioProps {
  termo: string
  buscaRef: RefObject<HTMLInputElement | null>
  somenteReformaTributaria: boolean
  onTermoChange: (termo: string) => void
  onAlternarReformaTributaria: () => void
  onLimpar: () => void
  onExpandirTodos: () => void
  onRecolherTodos: () => void
}

const CLASSE_DA_ACAO =
  'text-sm font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light'

/** Busca, filtro dos campos da reforma tributária e controle dos blocos. */
export function FiltrosDoDicionario({
  termo,
  buscaRef,
  somenteReformaTributaria,
  onTermoChange,
  onAlternarReformaTributaria,
  onLimpar,
  onExpandirTodos,
  onRecolherTodos,
}: FiltrosDoDicionarioProps) {
  const buscaId = useId()
  const filtroAtivo = somenteReformaTributaria || termo.trim() !== ''

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-border bg-white p-3">
      <label htmlFor={buscaId} className="sr-only">
        Buscar por nome, caminho ou significado do campo
      </label>
      <input
        ref={buscaRef}
        id={buscaId}
        type="search"
        value={termo}
        onChange={(evento) => onTermoChange(evento.target.value)}
        placeholder="Buscar por nome, caminho ou significado"
        className="h-9 min-w-[240px] flex-1 rounded-[var(--radius-input)] border border-border-control bg-white px-3 text-sm text-ink placeholder:text-muted focus:border-[1.5px] focus:border-primary-medium focus:outline-none"
      />

      <button
        type="button"
        aria-pressed={somenteReformaTributaria}
        onClick={onAlternarReformaTributaria}
        className={clsx(
          'inline-flex h-9 items-center gap-2 rounded-[var(--radius-pill)] border px-3 text-sm font-semibold hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light',
          somenteReformaTributaria
            ? 'border-primary bg-primary text-white'
            : 'border-border-control bg-white text-ink',
        )}
      >
        Só campos da reforma (RT)
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onExpandirTodos} className={CLASSE_DA_ACAO}>
          Expandir todos
        </button>
        <button type="button" onClick={onRecolherTodos} className={CLASSE_DA_ACAO}>
          Recolher todos
        </button>
        {filtroAtivo && (
          <button type="button" onClick={onLimpar} className={CLASSE_DA_ACAO}>
            Limpar filtro
          </button>
        )}
      </div>
    </div>
  )
}
