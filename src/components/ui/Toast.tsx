import clsx from 'clsx'
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react'
import type { ComponentType } from 'react'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  tone: ToastTone
  message: string
  onClose?: () => void
}

const toneConfig: Record<
  ToastTone,
  {
    bg: string
    texto: string
    Icone: ComponentType<{ className?: string }>
    role: 'status' | 'alert'
  }
> = {
  success: { bg: 'bg-alert-success', texto: 'text-ink', Icone: CircleCheck, role: 'status' },
  error: { bg: 'bg-alert-error', texto: 'text-ink', Icone: CircleX, role: 'alert' },
  warning: { bg: 'bg-alert-warning', texto: 'text-ink', Icone: TriangleAlert, role: 'alert' },
  info: { bg: 'bg-alert-info', texto: 'text-ink', Icone: Info, role: 'status' },
}

/** Fundo `alert-*` + ícone Lucide + texto — nunca cor isolada como único sinal. */
export function Toast({ tone, message, onClose }: ToastProps) {
  const { bg, texto, Icone, role } = toneConfig[tone]

  return (
    <div
      role={role}
      className={clsx(
        'flex min-h-[60px] items-center gap-3 rounded-[var(--radius-control)] px-4 py-3 text-sm',
        bg,
        texto,
      )}
    >
      <Icone className="size-5 shrink-0" />
      <p className="flex-1">{message}</p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar aviso"
          className={clsx(
            // Caixa visual pequena (p-1), mas alvo de toque 44×44 via ::after
            // com preenchimento invisível — mesmo padrão de `BotaoCopiar`.
            "relative shrink-0 rounded p-1 after:absolute after:top-1/2 after:left-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
            'hover:shadow-hover',
          )}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
