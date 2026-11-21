import { cn } from '../../../lib/cn'
import type { ChaveDoContador, ContadorDeMudanca } from '../utils/mudancasDaVersao'

export interface ContadoresDeMudancaProps {
  contadores: readonly ContadorDeMudanca[]
  className?: string
}

const ROTULO_DO_CONTADOR: Record<ChaveDoContador, { singular: string; plural: string }> = {
  novos: { singular: 'novo', plural: 'novos' },
  descontinuados: { singular: 'saiu', plural: 'saíram' },
  mudaramDeLugar: { singular: 'mudou de lugar', plural: 'mudaram de lugar' },
  renomeados: { singular: 'renomeado', plural: 'renomeados' },
  alterados: { singular: 'alterado', plural: 'alterados' },
}

const COR_DO_PONTO: Record<ChaveDoContador, string> = {
  novos: 'bg-success',
  descontinuados: 'bg-error-texto',
  mudaramDeLugar: 'bg-primary-light',
  renomeados: 'bg-accent',
  alterados: 'bg-muted',
}

/**
 * Quanto a versão mudou, uma pílula por tipo, numa linha só. O número conta campos: quando o
 * dicionário marca mais campos do que a lista tem itens (um grupo novo traz vários campos), vale o
 * número de campos e uma nota explica a diferença para a lista.
 */
export function ContadoresDeMudanca({ contadores, className }: ContadoresDeMudancaProps) {
  if (contadores.length === 0) return null

  const contaGruposNaLista = contadores.some(({ camposAfetados }) => camposAfetados !== null)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <ul className="flex flex-wrap gap-2">
        {contadores.map(({ chave, quantidade, camposAfetados }) => {
          const numero = camposAfetados ?? quantidade
          const { singular, plural } = ROTULO_DO_CONTADOR[chave]

          return (
            <li
              key={chave}
              data-contador={chave}
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-pill)] border border-border bg-white px-3.5 text-sm text-primary"
            >
              <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-full ${COR_DO_PONTO[chave]}`}
              />
              <strong className="font-extrabold tabular-nums">{numero}</strong>{' '}
              <span className="font-semibold">{numero === 1 ? singular : plural}</span>
            </li>
          )
        })}
      </ul>

      {contaGruposNaLista && (
        <p data-nota-dos-contadores="" className="text-xs text-muted">
          Os números contam campos. A lista abaixo junta os campos de um mesmo grupo numa mudança
          só.
        </p>
      )}
    </div>
  )
}
