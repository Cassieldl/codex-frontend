import type { ReactNode } from 'react'

interface TituloSecaoProps {
  id: string
  children: ReactNode
}

/** Título de seção da Home, com o fio laranja curto embaixo (decorativo). */
export function TituloSecao({ id, children }: TituloSecaoProps) {
  return (
    <h2
      id={id}
      className="relative pb-2 text-titulo font-extrabold text-primary after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-12 after:rounded-pill after:bg-accent"
    >
      {children}
    </h2>
  )
}
