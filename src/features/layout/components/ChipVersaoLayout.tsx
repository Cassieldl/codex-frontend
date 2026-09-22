import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import type { LayoutVersaoResumo } from '../types/layoutPublico'
import { BORDA_POR_ESTADO_VERSAO } from '../utils/estadoVersaoLayout'

export interface ChipVersaoLayoutProps {
  versao: LayoutVersaoResumo
  /** Versão aberta no momento — marca `aria-current="page"`. */
  ativa?: boolean
  className?: string
}

/**
 * Chip de versão do Layout InvoiCy. O artboard desenha um `<button>` com
 * `aria-pressed`, mas cada versão é uma **URL própria e copiável**
 * (`/layout/{slug}`) — então aqui é um `<Link>` real, mesmo motivo de
 * `AbasNavegaveis`.
 *
 * `activeOptions={{ exact: true }}` é obrigatório: o `<Link>` do TanStack
 * marca `aria-current="page"` por conta própria com casamento **parcial**, e
 * isso conviveria em silêncio com o `aria-current` que esta prop controla —
 * dois chips "atuais" ao mesmo tempo, sem erro e sem teste vermelho.
 */
export function ChipVersaoLayout({ versao, ativa = false, className }: ChipVersaoLayoutProps) {
  return (
    <Link
      to="/layout/$versaoSlug"
      params={{ versaoSlug: versao.slug }}
      activeOptions={{ exact: true }}
      aria-current={ativa ? 'page' : undefined}
      aria-label={`Ver o dicionário da versão ${versao.rotulo}`}
      className={clsx(
        'flex min-w-[132px] flex-col gap-0.5 rounded-[10px] px-3.5 py-2 text-ink no-underline hover:shadow-hover',
        BORDA_POR_ESTADO_VERSAO[versao.estado],
        ativa && 'bg-surface-hover',
        className,
      )}
    >
      <span className="text-card-titulo font-bold">{versao.rotulo}</span>
      <span className="text-aux font-semibold tracking-wide uppercase">{versao.estado}</span>
      <span className="text-aux text-ink/70">
        {versao.totalCampos} {versao.totalCampos === 1 ? 'campo' : 'campos'}
      </span>
    </Link>
  )
}
