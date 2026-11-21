import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '../../lib/cn'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  tone: ToastTone
  message: string
  onClose?: () => void
}

const toneConfig: Record<
  ToastTone,
  {
    superficie: string
    texto: string
    Icone: ComponentType<{ className?: string }>
    role: 'status' | 'alert'
  }
> = {
  success: {
    superficie: 'border-alert-success-borda bg-alert-success',
    texto: 'text-alert-success-texto',
    Icone: CircleCheck,
    role: 'status',
  },
  error: {
    superficie: 'border-alert-error-borda bg-alert-error',
    texto: 'text-alert-error-texto',
    Icone: CircleX,
    role: 'alert',
  },
  warning: {
    superficie: 'border-alert-warning-borda bg-alert-warning',
    texto: 'text-alert-warning-texto',
    Icone: TriangleAlert,
    role: 'alert',
  },
  info: {
    superficie: 'border-alert-info-borda bg-alert-info',
    texto: 'text-primary',
    Icone: Info,
    role: 'status',
  },
}

/** Tom de aviso (fundo, borda inteira e texto) + ícone Lucide: a cor nunca é o único sinal. */
export function Toast({ tone, message, onClose }: ToastProps) {
  const { superficie, texto, Icone, role } = toneConfig[tone]

  return (
    <div
      role={role}
      className={cn(
        'flex min-h-[60px] items-center gap-3 rounded-[var(--radius-aviso)] border px-4 py-3 text-sm',
        superficie,
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
          className={cn(
            // Caixa visual pequena (p-1), mas alvo de toque 44×44 via ::after
            // com preenchimento invisível - mesmo padrão de `BotaoCopiar`.
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
