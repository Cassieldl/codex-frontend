import { Link, type LinkProps } from '@tanstack/react-router'
import clsx from 'clsx'

export interface AbaNavegavel {
  rotulo: string
  /** Quantidade ao lado do rótulo (erros, campos). */
  contador?: number
  to: string
  params?: Record<string, string>
  /**
   * Search params da aba (§2.1) — usado quando a aba é um filtro por URL
   * (índice de artigos), não uma rota com parâmetro de caminho. Opcional e
   * retrocompatível: sem ele, o comportamento é o de antes.
   */
  search?: Record<string, unknown>
  ativa: boolean
}

export interface AbasNavegaveisProps {
  abas: AbaNavegavel[]
  ariaLabel: string
  className?: string
}

// Cada aba é uma URL de verdade (o que a torna copiável) — por isso é um
// <Link> real do TanStack Router, nunca role="tablist"/"tab" (esse padrão
// ARIA pressupõe troca de painel sem navegação). A barra de 3px em
// --color-accent é reforço visual, nunca o único sinal do estado ativo:
// soma-se a `aria-current="page"` e a `font-semibold`/`text-ink` (§3.2 —
// laranja sobre branco fica abaixo de 3:1 de contraste não-textual).
export function AbasNavegaveis({ abas, ariaLabel, className }: AbasNavegaveisProps) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul className="flex items-center gap-1 overflow-x-auto border-b border-line">
        {abas.map((aba) => (
          <li
            key={`${aba.to}-${JSON.stringify(aba.params ?? {})}-${JSON.stringify(aba.search ?? {})}`}
          >
            <Link
              to={aba.to as unknown as LinkProps['to']}
              params={(aba.params ?? {}) as unknown as LinkProps['params']}
              search={aba.search as unknown as LinkProps['search']}
              // O `<Link>` marca `aria-current` sozinho por casamento PARCIAL
              // de search: sem `exact`, a aba "Todos" (`{ pagina }`) casaria
              // também com `{ tipo, pagina }` e duas abas ficariam "current"
              // ao mesmo tempo. `ativa` continua sendo a fonte da verdade.
              activeOptions={{ exact: true }}
              aria-current={aba.ativa ? 'page' : undefined}
              className={clsx(
                'inline-flex items-center gap-2 border-b-[3px] px-3 py-2 text-sm whitespace-nowrap transition-shadow duration-150',
                aba.ativa
                  ? 'border-accent-hover font-semibold text-ink'
                  : 'border-transparent font-normal text-muted hover:shadow-hover',
              )}
            >
              {aba.rotulo}
              {aba.contador !== undefined && (
                <span
                  className={clsx(
                    'rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-bold tabular-nums',
                    aba.ativa ? 'bg-primary text-white' : 'bg-alert-info text-primary-medium',
                  )}
                >
                  {aba.contador}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
