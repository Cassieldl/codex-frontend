import clsx from 'clsx'
import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { indiceDaTecla } from './teclasDeEscolha'

/**
 * `compacto` mede 36 px no total, a altura do Select, para os dois alinharem na mesma barra.
 * `barra` mede 44 px, a altura dos botões de filtro ao lado: o trilho perde o respiro e a opção
 * mantém o alvo de 44 px.
 */
export type TamanhoDoAlternador = 'padrao' | 'compacto' | 'barra'

const CLASSES_DO_TRILHO: Record<TamanhoDoAlternador, string> = {
  padrao: 'p-1',
  compacto: 'p-0.5',
  barra: 'p-0',
}

const CLASSES_DA_OPCAO: Record<TamanhoDoAlternador, string> = {
  padrao: 'min-h-11',
  compacto: 'min-h-8',
  barra: 'min-h-11',
}

export interface AlternadorSegmentadoProps<T extends string> {
  id?: string
  /** Nome acessível do grupo, como "Alcance" ou "Formato". */
  rotulo: string
  opcoes: readonly T[]
  rotuloDaOpcao: Record<T, string>
  selecionada: T
  onSelecionar: (opcao: T) => void
  tamanho?: TamanhoDoAlternador
  className?: string
}

/**
 * Troca a visão do mesmo conteúdo (Mínimo/Máximo, XML/JSON). Aba troca de página ou de seção;
 * este alternador não. É um grupo de rádio: só a opção marcada entra no Tab, e as setas, Home e
 * End trocam a escolha levando o foco junto. A marcada tem fundo branco e sombra sobre o trilho.
 */
export function AlternadorSegmentado<T extends string>({
  id,
  rotulo,
  opcoes,
  rotuloDaOpcao,
  selecionada,
  onSelecionar,
  tamanho = 'padrao',
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
      id={id}
      role="radiogroup"
      aria-label={rotulo}
      className={clsx(
        'inline-flex gap-1 rounded-[var(--radius-control)] bg-surface-hover',
        CLASSES_DO_TRILHO[tamanho],
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
              'rounded-[var(--radius-control)] px-4 text-sm font-bold text-primary transition-[background-color,box-shadow] duration-150',
              CLASSES_DA_OPCAO[tamanho],
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
