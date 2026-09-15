import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import type { ReactNode } from 'react'

export interface CabecalhoPublicoProps {
  /**
   * `destaque` aplica o fundo escuro (`--grad-escuro`) e é usado só por
   * `/busca` (§7.1), que embute o campo de busca dentro do próprio
   * cabeçalho via `children`.
   */
  variante?: 'padrao' | 'destaque'
  children?: ReactNode
}

/**
 * Cabeçalho de toda página pública (M31 — dono: FRONT-A; demais unidades
 * importam, não editam). Nav mostra logo (→ `/`), "Provedores"
 * (→ `/provedores`), "Artigos" (→ `/artigos`) e "Como funciona"
 * (→ `/como-funciona`, §4.1 — sempre presente, mesmo antes de o artigo
 * reservado existir; é navegação, não dado).
 */
export function CabecalhoPublico({ variante = 'padrao', children }: CabecalhoPublicoProps) {
  const destaque = variante === 'destaque'

  return (
    <header
      className={clsx(
        destaque
          ? 'bg-[image:var(--grad-escuro)] text-white'
          : 'border-b border-line bg-white text-ink',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-8">
        <Link to="/" className="text-lg font-extrabold">
          Codex
        </Link>

        <nav aria-label="Navegação principal" className="flex items-center gap-6">
          <Link
            to="/provedores"
            search={{ pagina: 1 }}
            className={clsx(
              'text-sm font-medium hover:underline',
              destaque ? 'text-white' : 'text-ink',
            )}
          >
            Provedores
          </Link>
          <Link
            to="/artigos"
            search={{ pagina: 1 }}
            className={clsx(
              'text-sm font-medium hover:underline',
              destaque ? 'text-white' : 'text-ink',
            )}
          >
            Artigos
          </Link>
          <Link
            to="/como-funciona"
            className={clsx(
              'text-sm font-medium hover:underline',
              destaque ? 'text-white' : 'text-ink',
            )}
          >
            Como funciona
          </Link>
        </nav>
      </div>

      {children && <div className="mx-auto max-w-6xl px-4 pb-8 lg:px-8">{children}</div>}
    </header>
  )
}
