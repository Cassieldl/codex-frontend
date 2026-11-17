import clsx from 'clsx'
import type { EstadoPreenchimentoCampo } from '../types/versaoProvedorPagina'
import { ROTULO_DA_OBRIGATORIEDADE } from '../utils/obrigatoriedade'

export interface MarcadorObrigatoriedadeProps {
  estado: EstadoPreenchimentoCampo
  className?: string
}

export function FormaDoMarcador({ estado }: { estado: EstadoPreenchimentoCampo }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" className="size-full text-primary-medium">
      {estado === 'Obrigatorio' ? (
        <circle cx="5" cy="5" r="4.25" fill="currentColor" />
      ) : (
        <circle cx="5" cy="5" r="3.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      )}
      {estado === 'Condicional' && (
        <path d="M5 1.25 A3.75 3.75 0 0 0 5 8.75 Z" fill="currentColor" />
      )}
    </svg>
  )
}

/**
 * Obrigatoriedade do campo como marcador na linha do nome: ponto cheio, meio ponto ou ponto
 * vazado. A forma distingue sem depender de cor, e o nome vai no `title` e para o leitor de tela.
 */
export function MarcadorObrigatoriedade({ estado, className }: MarcadorObrigatoriedadeProps) {
  const rotulo = ROTULO_DA_OBRIGATORIEDADE[estado]

  return (
    <span
      title={rotulo}
      data-obrigatoriedade={estado}
      className={clsx('inline-flex size-2.5 shrink-0', className)}
    >
      <FormaDoMarcador estado={estado} />
      <span className="sr-only">{rotulo}</span>
    </span>
  )
}
