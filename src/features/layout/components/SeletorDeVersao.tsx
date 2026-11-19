import { useId } from 'react'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import type { LayoutVersaoResumo } from '../types/layoutPublico'

export interface SeletorDeVersaoProps {
  /** Já na ordem do backend (mais nova primeiro). */
  versoes: readonly LayoutVersaoResumo[]
  versaoAtualSlug: string
  onEscolher: (versaoSlug: string) => void
}

/**
 * Lista suspensa nativa com as versões publicadas: o único lugar da página para trocar de versão.
 * Escolher leva ao dicionário da versão; a dica avisa antes, para a troca não pegar de surpresa.
 */
export function SeletorDeVersao({ versoes, versaoAtualSlug, onEscolher }: SeletorDeVersaoProps) {
  const seletorId = useId()
  const dicaId = useId()

  if (versoes.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={seletorId} className="text-xs font-semibold text-ink">
        Versão
      </label>
      <select
        id={seletorId}
        aria-describedby={dicaId}
        value={versaoAtualSlug}
        onChange={(evento) => {
          if (evento.target.value !== versaoAtualSlug) onEscolher(evento.target.value)
        }}
        className="h-11 min-w-48 rounded-[var(--radius-input)] border border-border-control bg-white px-3 text-sm font-semibold text-primary hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover"
      >
        {versoes.map((versao) => (
          <option key={versao.slug} value={versao.slug}>
            {`${formatarVersaoLayout(versao.rotulo, { maiuscula: true })} · ${versao.estado.toLowerCase()}`}
          </option>
        ))}
      </select>
      <span id={dicaId} className="sr-only">
        Escolher outra versão abre o dicionário dela.
      </span>
    </div>
  )
}
