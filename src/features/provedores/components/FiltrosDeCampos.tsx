import { Check, Search } from 'lucide-react'
import { useId } from 'react'
import type { RefObject } from 'react'
import {
  CLASSE_DA_CAIXA_DE_FILTROS,
  CLASSE_DO_CHIP,
  CLASSE_DO_CHIP_PRESSIONADO,
  CLASSE_DO_CHIP_SOLTO,
} from '../../../components/ui/classesDosFiltros'
import { cn } from '../../../lib/cn'
import type { FiltroDeEstado } from '../utils/blocosDeCampos'

export interface FiltrosDeCamposProps {
  estado: FiltroDeEstado
  termo: string
  /** Contagem da versão inteira: não muda com o termo nem com o chip escolhido. */
  contagens: Record<FiltroDeEstado, number>
  somenteReformaTributaria: boolean
  /** Campos da reforma tributária na versão inteira; sem nenhum, o filtro não aparece. */
  contagemDaReforma: number
  filtroAtivo: boolean
  buscaRef: RefObject<HTMLInputElement | null>
  onEstadoChange: (estado: FiltroDeEstado) => void
  onTermoChange: (termo: string) => void
  onAlternarReformaTributaria: () => void
  onLimpar: () => void
  onExpandirTodos: () => void
  onRecolherTodos: () => void
}

interface OpcaoDeEstado {
  valor: FiltroDeEstado
  rotulo: string
}

const OPCOES_DE_ESTADO: OpcaoDeEstado[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'Obrigatorio', rotulo: 'Obrigatórios' },
  { valor: 'Condicional', rotulo: 'Condicionais' },
  { valor: 'Opcional', rotulo: 'Opcionais' },
]

const CLASSE_DA_ACAO =
  'text-sm font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover'

/**
 * Filtros da lista de campos num card: a busca larga em cima, os chips de obrigatoriedade e o
 * controle dos blocos embaixo. O chip pressionado se distingue por borda, fundo e ícone: o estado
 * não depende só de cor.
 */
export function FiltrosDeCampos({
  estado,
  termo,
  contagens,
  somenteReformaTributaria,
  contagemDaReforma,
  filtroAtivo,
  buscaRef,
  onEstadoChange,
  onTermoChange,
  onAlternarReformaTributaria,
  onLimpar,
  onExpandirTodos,
  onRecolherTodos,
}: FiltrosDeCamposProps) {
  const buscaId = useId()

  return (
    <div className={cn('flex flex-col gap-3', CLASSE_DA_CAIXA_DE_FILTROS)}>
      <div className="relative">
        <label htmlFor={buscaId} className="sr-only">
          Buscar campo do InvoiCy, tag do provedor ou caminho no XML
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-primary-medium"
        />
        <input
          ref={buscaRef}
          id={buscaId}
          type="search"
          value={termo}
          onChange={(evento) => onTermoChange(evento.target.value)}
          placeholder="Buscar por campo, tag ou caminho no XML (ex.: CNPJ, ValorServicos)"
          className="h-11 w-full rounded-[var(--radius-input)] border border-border-control bg-white pr-4 pl-11 text-sm text-ink placeholder:text-muted focus:border-[1.5px] focus:border-primary-medium focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filtrar por obrigatoriedade" className="flex flex-wrap gap-2">
          {OPCOES_DE_ESTADO.map(({ valor, rotulo }) => {
            const pressionado = estado === valor

            return (
              <button
                key={valor}
                type="button"
                aria-pressed={pressionado}
                onClick={() => onEstadoChange(valor)}
                className={cn(
                  CLASSE_DO_CHIP,
                  pressionado ? CLASSE_DO_CHIP_PRESSIONADO : CLASSE_DO_CHIP_SOLTO,
                )}
              >
                {pressionado && <Check aria-hidden="true" className="size-3.5 shrink-0" />}
                <span>{rotulo}</span> <b className="tabular-nums">{contagens[valor]}</b>
              </button>
            )
          })}
        </div>

        {contagemDaReforma > 0 && (
          <button
            type="button"
            aria-pressed={somenteReformaTributaria}
            onClick={onAlternarReformaTributaria}
            className={cn(
              CLASSE_DO_CHIP,
              somenteReformaTributaria ? CLASSE_DO_CHIP_PRESSIONADO : CLASSE_DO_CHIP_SOLTO,
            )}
          >
            {somenteReformaTributaria && <Check aria-hidden="true" className="size-3.5 shrink-0" />}
            <span>Só campos da reforma (RT)</span>{' '}
            <b className="tabular-nums">{contagemDaReforma}</b>
          </button>
        )}

        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          <button type="button" onClick={onExpandirTodos} className={CLASSE_DA_ACAO}>
            Expandir todos
          </button>
          <button type="button" onClick={onRecolherTodos} className={CLASSE_DA_ACAO}>
            Recolher todos
          </button>
          {filtroAtivo && (
            <button type="button" onClick={onLimpar} className={CLASSE_DA_ACAO}>
              Limpar filtros
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
