import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

export interface EmptyStateProps {
  message?: string
  icon?: ReactNode
  action?: ReactNode
}

const MENSAGEM_PADRAO = 'Nenhum item encontrado.'

export function EmptyState({ message = MENSAGEM_PADRAO, icon, action }: EmptyStateProps) {
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
