import type { ReactNode } from 'react'

interface TituloSecaoProps {
  id: string
  children: ReactNode
}

/** Título de seção da Home. Sem o traço laranja: ele marca só o título da página. */
export function TituloSecao({ id, children }: TituloSecaoProps) {
  return (
    <h2 id={id} className="text-titulo font-extrabold text-primary">
      {children}
    </h2>
  )
}
