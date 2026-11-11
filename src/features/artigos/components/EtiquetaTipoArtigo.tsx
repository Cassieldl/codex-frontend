import clsx from 'clsx'
import { ArrowRightLeft, BookOpen, ListOrdered, SlidersHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TipoArtigo } from '../types/artigo'
import { ROTULO_TIPO_ARTIGO } from './rotulosTipoArtigo'

const GLIFO_TIPO_ARTIGO: Record<TipoArtigo, LucideIcon> = {
  Conceito: BookOpen,
  Procedimento: ListOrdered,
  Mudanca: ArrowRightLeft,
  Configuracao: SlidersHorizontal,
}

export interface EtiquetaTipoArtigoProps {
  tipo: TipoArtigo
  className?: string
}

/**
 * Par glifo + rótulo que identifica o tipo do artigo, igual no índice (tela 7)
 * e no cabeçalho da página (tela 8).
 *
 * Sempre **neutro**: tipo de artigo não é severidade, então nunca usa a paleta
 * `--color-alert-*`/`--color-severidade-*` (mesma disciplina de
 * `EtiquetaEstado`). A distinção entre os três vem do glifo + do texto
 * literal — nunca de cor sozinha (WCAG 1.4.1).
 */
export function EtiquetaTipoArtigo({ tipo, className }: EtiquetaTipoArtigoProps) {
  const Glifo = GLIFO_TIPO_ARTIGO[tipo]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 text-aux font-semibold tracking-wide text-ink uppercase',
        className,
      )}
    >
      <Glifo className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
      {ROTULO_TIPO_ARTIGO[tipo]}
    </span>
  )
}
