import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export interface BlocoRecolhivelProps {
  titulo: string
  children?: ReactNode
}

/** `<details>` nativo: abre e fecha pelo teclado sem JavaScript próprio. Começa fechado. */
export function BlocoRecolhivel({ titulo, children }: BlocoRecolhivelProps) {
  return (
    <details className="group rounded-[var(--radius-control)] border border-line">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-4 shrink-0 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        {titulo}
      </summary>
      <div className="flex flex-col gap-3 border-t border-line px-4 py-3">{children}</div>
    </details>
  )
}
