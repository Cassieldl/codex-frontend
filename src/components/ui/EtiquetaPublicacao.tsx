import { EyeOff, PenLine } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface EtiquetaPublicacaoProps {
  /** Estado de publicação do próprio item, independente dos ancestrais. */
  publicadoProprio: boolean
  /** `publicadoProprio` do item **e** de todos os ancestrais já carregados na tela (M19). */
  publicadoEfetivo: boolean
  /** Rótulo do ancestral em rascunho - só faz sentido quando "publicado, oculto". */
  motivoOculto?: string
  className?: string
}

// Uso exclusivo da área interna (§3.4) - nunca renderizado em página pública.
// É decorativo: publicar/despublicar é sempre um botão dedicado, nunca esta etiqueta.
// O peso segue a atenção que o estado pede: publicado é o normal e fica em texto com um ponto;
// rascunho é a exceção e ganha a pílula destacada. Nenhum estado depende só de cor: cada um tem
// forma e texto literal distintos.
export function EtiquetaPublicacao({
  publicadoProprio,
  publicadoEfetivo,
  motivoOculto,
  className,
}: EtiquetaPublicacaoProps) {
  if (!publicadoProprio) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-alert-warning-icone bg-alert-warning px-2.5 py-0.5 text-xs font-semibold text-alert-warning-texto',
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
        className={cn(
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
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-ink', className)}>
      <span aria-hidden="true" className="size-2 shrink-0 rounded-pill bg-success" />
      Publicado
    </span>
  )
}
