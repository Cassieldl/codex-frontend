import { cn } from '../../../lib/cn'
import type { EstadoVersaoLayout } from '../types/layoutPublico'

export interface SeloEstadoDaVersaoProps {
  estado: EstadoVersaoLayout
  className?: string
}

/** Estado da versão do layout por extenso: a vigente em verde, as outras em cinza. */
export function SeloEstadoDaVersao({ estado, className }: SeloEstadoDaVersaoProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-[var(--radius-pill)] px-2.5 py-0.5 text-aux font-bold',
        estado === 'Vigente'
          ? 'border border-success bg-alert-success text-ink'
          : 'bg-surface-hover text-muted',
        className,
      )}
    >
      {estado}
    </span>
  )
}
