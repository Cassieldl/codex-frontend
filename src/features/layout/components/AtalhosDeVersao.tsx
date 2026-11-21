import { Link } from '@tanstack/react-router'
import { cn } from '../../../lib/cn'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import type { LayoutVersaoResumo } from '../types/layoutPublico'

export interface AtalhosDeVersaoProps {
  /** Já na ordem do backend (mais nova primeiro). */
  versoes: readonly LayoutVersaoResumo[]
  vigenteSlug: string | null
}

/**
 * "Versão do dicionário" no cabeçalho do hub: um atalho por versão publicada, com estado e campos,
 * que leva direto ao dicionário dela. É navegação, não alternador: a vigente só ganha destaque.
 */
export function AtalhosDeVersao({ versoes, vigenteSlug }: AtalhosDeVersaoProps) {
  if (versoes.length === 0) return null

  return (
    <nav aria-labelledby="atalhos-de-versao-titulo" className="flex flex-col gap-1.5">
      <p id="atalhos-de-versao-titulo" className="text-xs font-semibold text-ink">
        Versão do dicionário
      </p>
      <ul className="flex flex-wrap gap-1 rounded-[var(--radius-control)] bg-surface-hover p-1">
        {versoes.map((versao) => {
          const ehVigente = versao.slug === vigenteSlug

          return (
            <li key={versao.slug}>
              <Link
                to="/layout/$versaoSlug"
                params={{ versaoSlug: versao.slug }}
                activeOptions={{ exact: true }}
                data-atalho-de-versao={versao.slug}
                className={cn(
                  'flex min-h-11 flex-col justify-center rounded-[var(--radius-control)] px-4 py-1.5 text-primary no-underline hover:shadow-hover',
                  ehVigente && 'bg-white shadow-card',
                )}
              >
                {/* Os espaços separam as partes no nome acessível do link. */}
                <span className="text-sm font-extrabold">
                  {formatarVersaoLayout(versao.rotulo, { maiuscula: true })}
                </span>{' '}
                <span className="text-xs text-muted">
                  {versao.estado} · {versao.totalCampos}{' '}
                  {versao.totalCampos === 1 ? 'campo' : 'campos'}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
