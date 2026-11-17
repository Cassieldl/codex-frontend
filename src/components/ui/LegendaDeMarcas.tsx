import { useId } from 'react'
import type { ReactNode } from 'react'

export interface ItemDaLegendaDeMarcas {
  chave: string
  /** A marca como aparece na tela; fica fora do leitor de tela, que já ouve o nome por extenso. */
  marca: ReactNode
  significado: ReactNode
}

export interface LegendaDeMarcasProps {
  itens: ItemDaLegendaDeMarcas[]
}

/**
 * Legenda em uma linha das marcas de uma tabela ou de um texto: cada marca com o significado
 * escrito ao lado. Sem nenhum item, não aparece.
 */
export function LegendaDeMarcas({ itens }: LegendaDeMarcasProps) {
  const rotuloId = useId()

  if (itens.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span id={rotuloId} className="font-medium">
        Legenda:
      </span>
      <ul aria-labelledby={rotuloId} className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {itens.map(({ chave, marca, significado }) => (
          <li key={chave} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-flex items-center">
              {marca}
            </span>
            <span>{significado}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
