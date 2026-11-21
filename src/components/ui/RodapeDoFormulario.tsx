import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface RodapeDoFormularioProps {
  children: ReactNode
  className?: string
}

/**
 * Linha de Cancelar e Salvar de um formulário dentro do `Modal`. Fica presa ao fim do diálogo
 * enquanto o conteúdo rola, então o botão de salvar aparece sem descer a lista inteira. As margens
 * negativas cobrem o respiro lateral do diálogo (`px-7`), para a faixa ir de borda a borda.
 */
export function RodapeDoFormulario({ children, className }: RodapeDoFormularioProps) {
  return (
    <div
      className={cn(
        'sticky -bottom-5 z-10 -mx-7 flex justify-center gap-3 border-t border-border bg-white px-7 py-3',
        className,
      )}
    >
      {children}
    </div>
  )
}
