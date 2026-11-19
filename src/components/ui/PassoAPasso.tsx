import type { ReactNode } from 'react'

export interface ListaDePassosProps {
  inicio?: number
  children?: ReactNode
}

/** Continua um `<ol>`: o leitor de tela anuncia a ordem; o número visível é só visual. */
export function ListaDePassos({ inicio, children }: ListaDePassosProps) {
  return (
    <ol start={inicio} className="flex list-none flex-col gap-2">
      {children}
    </ol>
  )
}

export interface CartaoDePassoProps {
  numero: number
  children?: ReactNode
}

export function CartaoDePasso({ numero, children }: CartaoDePassoProps) {
  return (
    <li className="flex gap-3 text-ink">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center self-start justify-center rounded-full bg-primary text-sm font-bold text-white"
      >
        {numero}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">{children}</div>
    </li>
  )
}
