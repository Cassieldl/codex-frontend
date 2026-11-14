import clsx from 'clsx'
import { SeloReformaTributaria } from '../../../components/ui/SeloReformaTributaria'
import type { EstadoPreenchimentoCampo } from '../types/versaoProvedorPagina'

const ROTULO_DA_OBRIGATORIEDADE: Record<EstadoPreenchimentoCampo, string> = {
  Obrigatorio: 'Obrigatório',
  Condicional: 'Condicional',
  Opcional: 'Opcional',
}

const ORDEM_DA_LEGENDA: EstadoPreenchimentoCampo[] = ['Obrigatorio', 'Condicional', 'Opcional']

export interface MarcadorObrigatoriedadeProps {
  estado: EstadoPreenchimentoCampo
  className?: string
}

function FormaDoMarcador({ estado }: { estado: EstadoPreenchimentoCampo }) {
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

export interface LegendaDeObrigatoriedadeProps {
  /** A versão tem campo da reforma tributária: a legenda explica o selo também. */
  mostrarReformaTributaria: boolean
}

/** Legenda única dos marcadores, no topo da tabela de campos. */
export function LegendaDeObrigatoriedade({
  mostrarReformaTributaria,
}: LegendaDeObrigatoriedadeProps) {
  return (
    <div
      role="group"
      aria-label="Legenda da tabela de campos"
      className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted"
    >
      <span className="font-medium">Legenda:</span>
      {ORDEM_DA_LEGENDA.map((estado) => (
        <span key={estado} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-flex size-2.5">
            <FormaDoMarcador estado={estado} />
          </span>
          {ROTULO_DA_OBRIGATORIEDADE[estado].toLowerCase()}
        </span>
      ))}
      {mostrarReformaTributaria && (
        <span className="inline-flex items-center gap-1.5">
          <SeloReformaTributaria />
          <span aria-hidden="true">reforma tributária</span>
        </span>
      )}
    </div>
  )
}
