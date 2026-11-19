import clsx from 'clsx'
import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { indiceDaTecla } from './teclasDeEscolha'

export interface AlternadorSegmentadoProps<T extends string> {
  /** Nome acessível do grupo, como "Alcance" ou "Formato". */
  rotulo: string
  opcoes: readonly T[]
  rotuloDaOpcao: Record<T, string>
  selecionada: T
  onSelecionar: (opcao: T) => void
  className?: string
}

/**
 * Troca a visão do mesmo conteúdo (Mínimo/Máximo, XML/JSON). Aba troca de página ou de seção;
 * este alternador não. É um grupo de rádio: só a opção marcada entra no Tab, e as setas, Home e
 * End trocam a escolha levando o foco junto. A marcada tem fundo branco e sombra sobre o trilho.
 */
export function AlternadorSegmentado<T extends string>({
  rotulo,
  opcoes,
  rotuloDaOpcao,
  selecionada,
  onSelecionar,
  className,
}: AlternadorSegmentadoProps<T>) {
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
    <div
      ref={grupoRef}
      role="radiogroup"
      aria-label={rotulo}
      className={clsx(
        'inline-flex gap-1 rounded-[var(--radius-control)] bg-surface-hover p-1',
        className,
      )}
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
              'min-h-11 rounded-[var(--radius-control)] px-4 text-sm font-bold text-primary transition-[background-color,box-shadow] duration-150',
              marcada ? 'bg-white shadow-hover' : 'hover:bg-white/60',
            )}
          >
            {rotuloDaOpcao[opcao]}
          </button>
        )
      })}
    </div>
  )
}
