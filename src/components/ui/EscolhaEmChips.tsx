import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useId, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import {
  CLASSE_DO_CHIP,
  CLASSE_DO_CHIP_PRESSIONADO,
  CLASSE_DO_CHIP_SOLTO,
} from './classesDosFiltros'

export interface EscolhaEmChipsProps<T extends string> {
  /** Rótulo visível do grupo, também o nome acessível do `radiogroup`. */
  rotulo: string
  opcoes: readonly T[]
  rotuloDaOpcao: Record<T, string>
  selecionada: T
  onSelecionar: (opcao: T) => void
  className?: string
}

const TECLAS_DE_AVANCO = new Set(['ArrowRight', 'ArrowDown'])
const TECLAS_DE_RECUO = new Set(['ArrowLeft', 'ArrowUp'])

/** Índice da opção que a tecla escolhe, com volta nas pontas; `null` para outras teclas. */
function indiceDaTecla(tecla: string, atual: number, total: number): number | null {
  if (TECLAS_DE_AVANCO.has(tecla)) return (atual + 1) % total
  if (TECLAS_DE_RECUO.has(tecla)) return (atual - 1 + total) % total
  if (tecla === 'Home') return 0
  if (tecla === 'End') return total - 1
  return null
}

/**
 * Escolha única entre poucas opções, como grupo de rádio no desenho dos chips de filtro. Só a
 * opção marcada entra na ordem do Tab; as setas, Home e End trocam a escolha e levam o foco junto,
 * como num rádio nativo. A marcada se distingue por borda, fundo e ícone, não só por cor.
 */
export function EscolhaEmChips<T extends string>({
  rotulo,
  opcoes,
  rotuloDaOpcao,
  selecionada,
  onSelecionar,
  className,
}: EscolhaEmChipsProps<T>) {
  const rotuloId = useId()
  const grupoRef = useRef<HTMLDivElement | null>(null)

  function aoTeclar(evento: KeyboardEvent<HTMLButtonElement>) {
    const atual = opcoes.indexOf(selecionada)
    const proximo = indiceDaTecla(evento.key, atual, opcoes.length)
    if (proximo === null) return

    evento.preventDefault()
    onSelecionar(opcoes[proximo])
    grupoRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[proximo]?.focus()
  }

  return (
    <div className={clsx('flex flex-col gap-0.5', className)}>
      <span id={rotuloId} className="text-xs font-normal text-ink lg:text-sm">
        {rotulo}
      </span>
      <div
        ref={grupoRef}
        role="radiogroup"
        aria-labelledby={rotuloId}
        className="flex flex-wrap gap-2"
      >
        {opcoes.map((opcao) => {
          const marcada = opcao === selecionada

          return (
            <button
              key={opcao}
              type="button"
              role="radio"
              aria-checked={marcada}
              tabIndex={marcada ? 0 : -1}
              onClick={() => onSelecionar(opcao)}
              onKeyDown={aoTeclar}
              className={clsx(
                CLASSE_DO_CHIP,
                marcada ? CLASSE_DO_CHIP_PRESSIONADO : CLASSE_DO_CHIP_SOLTO,
              )}
            >
              {marcada && <Check aria-hidden="true" className="size-3.5 shrink-0" />}
              {rotuloDaOpcao[opcao]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
