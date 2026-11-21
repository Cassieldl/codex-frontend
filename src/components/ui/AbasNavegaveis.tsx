import { Link, type LinkProps } from '@tanstack/react-router'
import type { KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'

export interface AbaNavegavel {
  rotulo: string
  /** Quantidade ao lado do rótulo (erros, campos). */
  contador?: number
  to: string
  params?: Record<string, string>
  /**
   * Search params da aba (§2.1) - usado quando a aba é um filtro por URL
   * (índice de artigos), não uma rota com parâmetro de caminho. Opcional e
   * retrocompatível: sem ele, o comportamento é o de antes.
   */
  search?: Record<string, unknown>
  ativa: boolean
}

export type TamanhoDasAbas = 'padrao' | 'destaque'

export interface AbasNavegaveisProps {
  abas: AbaNavegavel[]
  ariaLabel: string
  /**
   * `destaque`: abas de seção de página (texto maior, alvo de 44px) sobre uma faixa que já tem a
   * própria borda inferior.
   */
  tamanho?: TamanhoDasAbas
  /** Setas, `Home` e `End` movem o foco entre as abas; `Enter` abre a aba focada. */
  navegacaoPorSetas?: boolean
  className?: string
}

interface ClassesDoTamanho {
  lista: string
  aba: string
  inativa: string
}

const CLASSES_DO_TAMANHO: Record<TamanhoDasAbas, ClassesDoTamanho> = {
  padrao: {
    lista: 'border-b border-border',
    aba: 'px-3 py-2 text-sm',
    inativa: 'font-normal hover:shadow-hover',
  },
  destaque: {
    lista: '',
    aba: 'min-h-11 px-4 py-3 text-base',
    inativa: 'font-semibold hover:text-primary',
  },
}

// Cada aba é uma URL de verdade (o que a torna copiável) - por isso é um
// <Link> real do TanStack Router, nunca role="tablist"/"tab" (esse padrão
// ARIA pressupõe troca de painel sem navegação). A barra de 3px em
// --color-accent é reforço visual, nunca o único sinal do estado ativo:
// soma-se a `aria-current="page"`, ao `text-ink` e ao contador escuro (§3.2: laranja
// sobre branco fica abaixo de 3:1 de contraste não-textual).
export function AbasNavegaveis({
  abas,
  ariaLabel,
  tamanho = 'padrao',
  navegacaoPorSetas = false,
  className,
}: AbasNavegaveisProps) {
  const classes = CLASSES_DO_TAMANHO[tamanho]

  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul className={cn('flex items-center gap-1 overflow-x-auto', classes.lista)}>
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
              onKeyDown={navegacaoPorSetas ? moverFocoEntreAbas : undefined}
              className={cn(
                'inline-flex items-center gap-2 border-b-[3px] whitespace-nowrap transition-[box-shadow,color] duration-150',
                classes.aba,
                aba.ativa
                  ? 'border-accent-hover font-semibold text-ink'
                  : cn('border-transparent text-muted', classes.inativa),
              )}
            >
              {aba.rotulo}
              {aba.contador !== undefined && (
                <span
                  className={cn(
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

// Só move o foco, sem navegar: cada aba é um link, e abrir continua sendo `Enter`.
function moverFocoEntreAbas(evento: KeyboardEvent<HTMLAnchorElement>) {
  const lista = evento.currentTarget.closest('ul')
  if (!lista) return

  const links = Array.from(lista.querySelectorAll<HTMLAnchorElement>('a'))
  const atual = links.indexOf(evento.currentTarget)

  const destinoPorTecla: Record<string, number> = {
    ArrowRight: (atual + 1) % links.length,
    ArrowLeft: (atual - 1 + links.length) % links.length,
    Home: 0,
    End: links.length - 1,
  }

  const destino = destinoPorTecla[evento.key]
  if (destino === undefined) return

  evento.preventDefault()
  links[destino]?.focus()
}
