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
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {contadores.map(({ chave, quantidade, camposAfetados }) => {
        const { singular, plural } = ROTULO_DO_CONTADOR[chave]

        return (
          <li
            key={chave}
            data-contador={chave}
            className="flex flex-col gap-0.5 rounded-xl border border-line bg-white px-5 py-4"
          >
            <strong className="text-titulo leading-none font-extrabold text-primary tabular-nums">
              {quantidade}
            </strong>
            <span className="text-sm font-bold text-primary">
              {quantidade === 1 ? singular : plural}
            </span>
            {camposAfetados !== null && (
              <span data-campos-afetados="" className="text-xs text-muted tabular-nums">
                {camposAfetados} {camposAfetados === 1 ? 'campo' : 'campos'}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
