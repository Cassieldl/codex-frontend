import clsx from 'clsx'
import { Check, Copy, Link2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export type IconeCopiar = 'copiar' | 'link'

export interface BotaoCopiarProps {
  valor: string | (() => string)
  /** Específico do contexto — nunca "Copiar" genérico (ex.: "Copiar link do verbete RPS"). */
  ariaLabel: string
  /** Texto do botão. Em `compacto`, vira a dica que aparece no hover e no foco. */
  rotulo: string
  /**
   * Distingue as duas ações quando elas aparecem lado a lado. Prancheta copia um valor;
   * elo copia um endereço. Sem isso, dois botões de "cópia" ficam idênticos.
   */
  icone?: IconeCopiar
  /**
   * Esconde o rótulo, deixando só o ícone — para tabela densa, onde dois botões rotulados por
   * linha competem com o conteúdo.
   *
   * O rótulo não é removido, muda de lugar: vira dica visível no hover **e no foco por teclado**.
   * Dica só de hover deixaria quem usa toque ou teclado sem saber o que o botão faz, e é por isso
   * que o modo compacto não é o padrão.
   */
  compacto?: boolean
  className?: string
}

const DURACAO_ESTADO_COPIADO_MS = 2000

const ICONE: Record<IconeCopiar, typeof Copy> = {
  copiar: Copy,
  link: Link2,
}

export function BotaoCopiar({
  valor,
  ariaLabel,
  rotulo,
  icone = 'copiar',
  compacto = false,
  className,
}: BotaoCopiarProps) {
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

  const Icone = copiado ? Check : ICONE[icone]

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={clsx(
        // Caixa visual pequena (h-8), mas alvo de toque 44×44 via ::after
        // com preenchimento invisível — nunca cresce a caixa visível em si.
        "group relative inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] border border-border bg-white text-xs font-medium text-ink after:absolute after:top-1/2 after:left-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
        compacto ? 'w-8 justify-center' : 'px-2.5',
        'hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light',
        className,
      )}
    >
      <Icone className={clsx('size-3.5 shrink-0', copiado && 'text-success')} aria-hidden="true" />

      {compacto ? (
        /* A dica responde a foco além de hover — teclado e leitor de foco alcançam o mesmo que o
           mouse. `aria-hidden` evita que o leitor de tela anuncie o texto duas vezes, já que o
           `aria-label` do botão cobre. */
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-[var(--radius-control)] bg-ink px-2 py-1 text-[11px] whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {copiado ? 'Copiado' : rotulo}
        </span>
      ) : copiado ? (
        'Copiado'
      ) : (
        rotulo
      )}

      <span role="status" aria-live="polite" className="sr-only">
        {copiado ? 'Copiado' : ''}
      </span>
    </button>
  )
}
