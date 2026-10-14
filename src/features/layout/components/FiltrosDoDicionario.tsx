import { useId } from 'react'
import type { RefObject } from 'react'

export interface FiltrosDoDicionarioProps {
  termo: string
  buscaRef: RefObject<HTMLInputElement | null>
  onTermoChange: (termo: string) => void
  onLimpar: () => void
  onExpandirTodos: () => void
  onRecolherTodos: () => void
}

const CLASSE_DA_ACAO =
  'text-sm font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light'

/** Busca e controle dos blocos. O vocabulário não tem obrigatoriedade, então não há chips. */
export function FiltrosDoDicionario({
  termo,
  buscaRef,
  onTermoChange,
  onLimpar,
  onExpandirTodos,
  onRecolherTodos,
}: FiltrosDoDicionarioProps) {
  const buscaId = useId()
  const filtroAtivo = termo.trim() !== ''

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface-hover p-3">
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
