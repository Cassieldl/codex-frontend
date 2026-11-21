import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface SobrelinhaProps {
  children: ReactNode
  /**
   * `escura` (padrão) é o fundo com pontos de luz do cabeçalho e do rodapé: usa o laranja de texto
   * sobre escuro. Sobre fundo claro o texto fica azul: laranja sobre branco mede 2,44:1.
   */
  superficie?: 'escura' | 'clara'
}

/** Rótulo curto acima de um título, sem traço: o traço laranja fica só no título da página. */
export function Sobrelinha({ children, superficie = 'escura' }: SobrelinhaProps) {
  return (
    <p
      className={cn(
        'text-xs font-bold tracking-wider uppercase',
        superficie === 'escura' ? 'text-accent-sobre-escuro' : 'text-primary-medium',
      )}
    >
      {children}
    </p>
  )
}
