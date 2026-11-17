import type { ChaveDoContador, ContadorDeMudanca } from '../utils/mudancasDaVersao'

export interface ContadoresDeMudancaProps {
  contadores: readonly ContadorDeMudanca[]
}

const ROTULO_DO_CONTADOR: Record<ChaveDoContador, { singular: string; plural: string }> = {
  novos: { singular: 'novo', plural: 'novos' },
  descontinuados: { singular: 'saiu', plural: 'saíram' },
  mudaramDeLugar: { singular: 'mudou de lugar', plural: 'mudaram de lugar' },
  renomeados: { singular: 'renomeado', plural: 'renomeados' },
}

/**
 * Quanto a versão mudou, uma caixa por tipo. O número bate com a lista logo abaixo; quando o
 * dicionário marca outra quantidade de campos, ela vem ao lado, menor ("6 novos · 44 campos").
 */
export function ContadoresDeMudanca({ contadores }: ContadoresDeMudancaProps) {
  if (contadores.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-2">
      {contadores.map(({ chave, quantidade, camposAfetados }) => {
        const { singular, plural } = ROTULO_DO_CONTADOR[chave]

        return (
          <li
            key={chave}
            data-contador={chave}
            className="inline-flex items-baseline gap-1.5 rounded-[var(--radius-control)] border border-line bg-surface-hover px-3 py-1"
          >
            <strong className="text-card-titulo font-bold text-ink tabular-nums">
              {quantidade}
            </strong>
            <span className="text-xs text-muted">{quantidade === 1 ? singular : plural}</span>
            {camposAfetados !== null && (
              <span data-campos-afetados="" className="text-xs text-muted tabular-nums">
                · {camposAfetados} {camposAfetados === 1 ? 'campo' : 'campos'}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
