import clsx from 'clsx'
import type { ReactNode } from 'react'

interface SobrelinhaProps {
  children: ReactNode
  /** Sobre fundo claro o texto fica azul: laranja sobre branco mede 2,44:1 e reprova AA. */
  superficie?: 'escura' | 'clara'
}

/** Rótulo curto acima de um título, sem traço: o traço laranja fica só no título da página. */
export function Sobrelinha({ children, superficie = 'escura' }: SobrelinhaProps) {
  return (
    <p
      className={clsx(
        'text-xs font-bold tracking-wider uppercase',
        superficie === 'escura' ? 'text-accent' : 'text-primary-medium',
      )}
    >
      {children}
    </p>
  )
}
