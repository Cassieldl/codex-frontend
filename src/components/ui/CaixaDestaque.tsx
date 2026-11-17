import { ListChecks } from 'lucide-react'
import { useId, type ReactNode } from 'react'

export interface CaixaDestaqueProps {
  children?: ReactNode
}

/** Resumo do topo do artigo. O rótulo é texto visível: a cor e o ícone nunca são o único sinal. */
export function CaixaDestaque({ children }: CaixaDestaqueProps) {
  const rotuloId = useId()

  return (
    <div
      role="note"
      aria-labelledby={rotuloId}
      data-caixa="resumo"
      className="flex flex-col gap-2 rounded-[var(--radius-control)] border-l-4 border-primary-light bg-alert-info p-5 text-ink shadow-card"
    >
      <p id={rotuloId} className="flex items-center gap-2 font-semibold text-primary-medium">
        <ListChecks className="size-4 shrink-0" aria-hidden="true" />
        Resumo rápido
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}
