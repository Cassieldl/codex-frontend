import clsx from 'clsx'
import type { ReactNode } from 'react'

interface SobrelinhaProps {
  children: ReactNode
  /** Sobre fundo claro o texto fica azul: laranja sobre branco mede 2,44:1 e reprova AA. */
  superficie?: 'escura' | 'clara'
}

/** Rótulo curto acima de um título, com traço laranja (decorativo nas duas superfícies). */
export function Sobrelinha({ children, superficie = 'escura' }: SobrelinhaProps) {
  return (
    <p
      className={clsx(
        'flex items-center gap-2 text-xs font-bold tracking-wider uppercase',
        superficie === 'escura' ? 'text-accent' : 'text-primary-medium',
      )}
    >
      <span aria-hidden="true" className="h-0.5 w-6 rounded-pill bg-accent" />
      {children}
    </p>
  )
}
