import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

export type VarianteEmptyState = 'bloco' | 'linha'

export interface EmptyStateProps {
  message?: string
  icon?: ReactNode
  action?: ReactNode
  /** `linha`: vazio de uma seção que divide a página com outras, sem ocupar um bloco inteiro. */
  variante?: VarianteEmptyState
}

const MENSAGEM_PADRAO = 'Nenhum item encontrado.'

export function EmptyState({
  message = MENSAGEM_PADRAO,
  icon,
  action,
  variante = 'bloco',
}: EmptyStateProps) {
  if (variante === 'linha') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <span aria-hidden="true">{icon ?? <Inbox className="size-4" />}</span>
        <p>{message}</p>
        {action}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span aria-hidden="true" className="text-muted">
        {icon ?? <Inbox className="size-10" />}
      </span>
      <p className="text-sm text-muted">{message}</p>
      {action}
    </div>
  )
}
