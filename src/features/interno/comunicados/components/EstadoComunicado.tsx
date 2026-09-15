import { CalendarOff } from 'lucide-react'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'

export interface EstadoComunicadoProps {
  publicado: boolean
  /** Derivado na leitura (`expiraEm <= agora`) — independente de `publicado`. */
  encerrado: boolean
  className?: string
}

/**
 * Estado de um comunicado na listagem interna (§7.1). `publicado` e `encerrado`
 * são independentes, mas dois booleans lado a lado não se leem: esta etiqueta
 * resolve os dois num único badge.
 *
 * Vive na feature, não em `components/ui/`: o terceiro estado ("Encerrado") só
 * existe em Comunicado — nenhuma outra entidade do Codex tem expiração.
 *
 * Nunca depende só de cor: cada estado tem ícone e texto próprios.
 */
export function EstadoComunicado({ publicado, encerrado, className }: EstadoComunicadoProps) {
  if (publicado && encerrado) {
    return (
      <span
        className={
          'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-dashed border-muted px-2.5 py-0.5 text-xs font-medium text-ink' +
          (className ? ` ${className}` : '')
        }
      >
        <CalendarOff className="size-3.5 shrink-0" aria-hidden="true" />
        Encerrado
      </span>
    )
  }

  return (
    <EtiquetaPublicacao
      publicadoProprio={publicado}
      publicadoEfetivo={publicado}
      className={className}
    />
  )
}
