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

export type VarianteEtiquetaTipoArtigo = 'neutra' | 'chip'

export interface EtiquetaTipoArtigoProps {
  tipo: TipoArtigo
  className?: string
  /** `chip` é a etiqueta do design system nos cards: só o rótulo, sobre o azul suave. */
  variante?: VarianteEtiquetaTipoArtigo
}

/**
 * Par glifo + rótulo que identifica o tipo do artigo, igual no índice (tela 7)
 * e no cabeçalho da página (tela 8).
 *
 * Nunca usa cor de severidade: tipo de artigo não é aviso. O azul suave do chip é o
 * fundo de etiqueta do design system, não o de dica. A distinção entre os tipos vem
 * do texto literal, nunca de cor sozinha (WCAG 1.4.1).
 */
export function EtiquetaTipoArtigo({
  tipo,
  className,
  variante = 'neutra',
}: EtiquetaTipoArtigoProps) {
  if (variante === 'chip') {
    return (
      <span
        className={clsx(
          'inline-flex self-start rounded-[var(--radius-control)] bg-alert-info px-2 py-1 text-xs font-bold tracking-wider text-primary uppercase',
          className,
        )}
      >
        {ROTULO_TIPO_ARTIGO[tipo]}
      </span>
    )
  }

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
