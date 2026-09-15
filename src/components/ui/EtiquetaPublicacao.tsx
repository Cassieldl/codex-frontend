import clsx from 'clsx'
import { CheckCircle2, EyeOff, PenLine } from 'lucide-react'

export interface EtiquetaPublicacaoProps {
  /** Estado de publicação do próprio item, independente dos ancestrais. */
  publicadoProprio: boolean
  /** `publicadoProprio` do item **e** de todos os ancestrais já carregados na tela (M19). */
  publicadoEfetivo: boolean
  /** Rótulo do ancestral em rascunho — só faz sentido quando "publicado, oculto". */
  motivoOculto?: string
  className?: string
}

// Uso exclusivo da área interna (§3.4) — nunca renderizado em página pública.
// É decorativo: publicar/despublicar é sempre um <Button> dedicado ao lado,
// nunca esta etiqueta. Os três estados nunca dependem só de cor — cada um
// tem forma de borda + ícone + texto literal distintos.
export function EtiquetaPublicacao({
  publicadoProprio,
  publicadoEfetivo,
  motivoOculto,
  className,
}: EtiquetaPublicacaoProps) {
  if (!publicadoProprio) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-solid border-border px-2.5 py-0.5 text-xs font-medium text-ink',
          className,
        )}
      >
        <PenLine className="size-3.5 shrink-0" aria-hidden="true" />
        Rascunho
      </span>
    )
  }

  if (!publicadoEfetivo) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-dashed border-muted px-2.5 py-0.5 text-xs font-medium text-ink',
          className,
        )}
      >
        <EyeOff className="size-3.5 shrink-0" aria-hidden="true" />
        {motivoOculto
          ? `Publicado · oculto porque ${motivoOculto} está em rascunho`
          : 'Publicado, oculto'}
      </span>
    )
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border-2 border-solid border-success px-2.5 py-0.5 text-xs font-medium text-ink',
        className,
      )}
    >
      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
      Publicado
    </span>
  )
}
