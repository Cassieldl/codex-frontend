import clsx from 'clsx'
import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface BotaoCopiarProps {
  valor: string | (() => string)
  /** Específico do contexto — nunca "Copiar" genérico (ex.: "Copiar link do verbete RPS"). */
  ariaLabel: string
  /** Texto visível — nunca só ícone. */
  rotulo: string
  className?: string
}

const DURACAO_ESTADO_COPIADO_MS = 2000

export function BotaoCopiar({ valor, ariaLabel, rotulo, className }: BotaoCopiarProps) {
  const [copiado, setCopiado] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function handleClick() {
    const valorFinal = typeof valor === 'function' ? valor() : valor
    await navigator.clipboard.writeText(valorFinal)

    setCopiado(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopiado(false), DURACAO_ESTADO_COPIADO_MS)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={clsx(
        // Caixa visual pequena (h-8), mas alvo de toque 44×44 via ::after
        // com preenchimento invisível — nunca cresce a caixa visível em si.
        "relative inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] border border-border bg-white px-2.5 text-xs font-medium text-ink after:absolute after:top-1/2 after:left-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
        'hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light',
        className,
      )}
    >
      {copiado ? (
        <Check className="size-3.5 shrink-0 text-success" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      {copiado ? 'Copiado' : rotulo}
      <span role="status" aria-live="polite" className="sr-only">
        {copiado ? 'Copiado' : ''}
      </span>
    </button>
  )
}
