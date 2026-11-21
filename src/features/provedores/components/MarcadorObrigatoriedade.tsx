import { cn } from '../../../lib/cn'
import type { EstadoPreenchimentoCampo } from '../types/versaoProvedorPagina'
import { ROTULO_DA_OBRIGATORIEDADE } from '../utils/obrigatoriedade'

export interface MarcadorObrigatoriedadeProps {
  estado: EstadoPreenchimentoCampo
  className?: string
}

/** Cor reforça, o texto decide: a etiqueta sempre diz o uso por extenso. */
const CLASSE_POR_ESTADO: Record<EstadoPreenchimentoCampo, string> = {
  Obrigatorio: 'border-primary bg-primary text-white',
  Condicional: 'border-primary-light bg-alert-info text-primary-medium',
  Opcional: 'border-border-control bg-white text-ink',
}

/** Uso do campo (obrigatório, condicional ou opcional) como etiqueta na linha do nome. */
export function MarcadorObrigatoriedade({ estado, className }: MarcadorObrigatoriedadeProps) {
  return (
    <span
      data-obrigatoriedade={estado}
      className={cn(
        'inline-flex shrink-0 items-center rounded-[var(--radius-check)] border px-1.5 py-0.5 text-aux leading-none font-bold',
        CLASSE_POR_ESTADO[estado],
        className,
      )}
    >
      {ROTULO_DA_OBRIGATORIEDADE[estado]}
    </span>
  )
}
