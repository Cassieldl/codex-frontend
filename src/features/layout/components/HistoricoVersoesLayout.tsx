import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import type { LayoutVersaoResumo } from '../types/layoutPublico'
import { BORDA_DO_CHIP_DE_VERSAO } from '../utils/estadoVersaoLayout'

export interface HistoricoVersoesLayoutProps {
  /** Já ordenado por `ordem` DESC pelo backend, nunca reordenado aqui. */
  versoes: LayoutVersaoResumo[]
  /** Versão aberta no momento, quando o histórico aparece dentro de uma. */
  versaoAtualSlug?: string
}

/**
 * Histórico de versões: lista compacta com o estado escrito por extenso, como
 * nos chips. Toda versão publicada continua acessível: provedores em produção
 * seguem escritos contra versões anteriores.
 */
export function HistoricoVersoesLayout({ versoes, versaoAtualSlug }: HistoricoVersoesLayoutProps) {
  if (versoes.length === 0) return null

  return (
    <section aria-labelledby="historico-versoes-titulo" className="flex flex-col gap-3">
      <h2 id="historico-versoes-titulo" className="text-subtitulo font-semibold text-ink">
        Histórico de versões
      </h2>
      <p className="text-sm text-muted">
        Toda versão publicada continua acessível: provedores em produção seguem escritos contra
        versões anteriores.
      </p>

      <ul className="flex flex-col divide-y divide-line rounded-[var(--radius-card)] border border-border">
        {versoes.map((versao) => {
          const atual = versao.slug === versaoAtualSlug

          return (
            <li key={versao.slug} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span
                className={clsx(
                  'inline-flex min-w-[96px] items-center justify-center rounded-[var(--radius-pill)] px-2.5 py-0.5 font-mono text-sm font-bold text-ink tabular-nums',
                  BORDA_DO_CHIP_DE_VERSAO,
                )}
              >
                {formatarVersaoLayout(versao.rotulo, { maiuscula: true })}
              </span>
              <span className="text-xs font-medium text-muted">{versao.estado}</span>
              <span className="text-xs text-muted tabular-nums">
                {versao.totalCampos} {versao.totalCampos === 1 ? 'campo' : 'campos'}
              </span>
              {atual ? (
                <span className="ml-auto text-xs font-semibold text-muted">
                  Você está vendo esta versão
                </span>
              ) : (
                <Link
                  to="/layout/$versaoSlug"
                  params={{ versaoSlug: versao.slug }}
                  activeOptions={{ exact: true }}
                  className="ml-auto text-sm font-semibold text-primary-medium hover:underline"
                >
                  Ver o dicionário
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
