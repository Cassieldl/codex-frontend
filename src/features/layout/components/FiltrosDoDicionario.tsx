import { Search } from 'lucide-react'
import { useId } from 'react'
import type { ReactNode, RefObject } from 'react'
import { AlternadorSegmentado } from '../../../components/ui/AlternadorSegmentado'
import { cn } from '../../../lib/cn'

export interface FiltrosDoDicionarioProps {
  termo: string
  buscaRef: RefObject<HTMLInputElement | null>
  /** Entra no texto de exemplo da busca. */
  totalCampos: number
  somenteReformaTributaria: boolean
  /** "Só o que mudou" ligado: só os campos novos nesta versão. */
  somenteNovos: boolean
  /** A primeira versão não tem anterior com que comparar: sem o alternador. */
  comAlternadorDeMudancas: boolean
  /** Alternador Dicionário / XML / JSON da página, na mesma barra. */
  alternadorDeVisao?: ReactNode
  onTermoChange: (termo: string) => void
  onAlternarReformaTributaria: () => void
  onSomenteNovosChange: (somenteNovos: boolean) => void
  onLimpar: () => void
  onExpandirTodos: () => void
  onRecolherTodos: () => void
}

type Alcance = 'completo' | 'mudou'

const ALCANCES: readonly Alcance[] = ['completo', 'mudou']

const ROTULO_DO_ALCANCE: Record<Alcance, string> = {
  completo: 'Layout completo',
  mudou: 'Só o que mudou',
}

const CLASSE_DA_ACAO =
  'text-sm font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover'

function textoDeExemplo(totalCampos: number): string {
  return totalCampos > 1
    ? `Buscar nos ${totalCampos} campos: nome, caminho ou significado`
    : 'Buscar por nome, caminho ou significado'
}

/**
 * Barra única do dicionário: busca larga em cima; embaixo a visão, o recorte do que mudou, o filtro
 * dos campos da reforma tributária. Com filtro, os resultados vêm em blocos recolhíveis, e só então
 * aparecem "Expandir todos" e "Recolher todos".
 */
export function FiltrosDoDicionario({
  termo,
  buscaRef,
  totalCampos,
  somenteReformaTributaria,
  somenteNovos,
  comAlternadorDeMudancas,
  alternadorDeVisao,
  onTermoChange,
  onAlternarReformaTributaria,
  onSomenteNovosChange,
  onLimpar,
  onExpandirTodos,
  onRecolherTodos,
}: FiltrosDoDicionarioProps) {
  const buscaId = useId()
  const filtroAtivo = somenteReformaTributaria || somenteNovos || termo.trim() !== ''

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-white p-4">
      <div className="relative">
        <label htmlFor={buscaId} className="sr-only">
          Buscar por nome, caminho ou significado do campo
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
        />
        <input
          ref={buscaRef}
          id={buscaId}
          type="search"
          value={termo}
          onChange={(evento) => onTermoChange(evento.target.value)}
          placeholder={textoDeExemplo(totalCampos)}
          className="h-11 w-full rounded-[var(--radius-input)] border border-border-control bg-white pr-3 pl-10 text-sm text-ink placeholder:text-muted focus:border-[1.5px] focus:border-primary-medium focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {alternadorDeVisao}

        {comAlternadorDeMudancas && (
          <AlternadorSegmentado
            rotulo="O que mostrar"
            tamanho="barra"
            opcoes={ALCANCES}
            rotuloDaOpcao={ROTULO_DO_ALCANCE}
            selecionada={somenteNovos ? 'mudou' : 'completo'}
            onSelecionar={(alcance) => {
              const novoSomenteNovos = alcance === 'mudou'
              if (novoSomenteNovos !== somenteNovos) onSomenteNovosChange(novoSomenteNovos)
            }}
          />
        )}

        <button
          type="button"
          aria-pressed={somenteReformaTributaria}
          onClick={onAlternarReformaTributaria}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-pill)] border px-4 text-sm font-bold hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover',
            somenteReformaTributaria
              ? 'border-primary bg-primary text-white'
              : 'border-border-control bg-white text-primary',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'rounded-[var(--radius-pill)] px-1.5 py-px text-aux font-bold',
              somenteReformaTributaria ? 'bg-white text-primary' : 'bg-primary text-white',
            )}
          >
            RT
          </span>
          Só reforma tributária
        </button>

        {filtroAtivo && (
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <button type="button" onClick={onExpandirTodos} className={CLASSE_DA_ACAO}>
              Expandir todos
            </button>
            <button type="button" onClick={onRecolherTodos} className={CLASSE_DA_ACAO}>
              Recolher todos
            </button>
            <button type="button" onClick={onLimpar} className={CLASSE_DA_ACAO}>
              Limpar filtro
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
