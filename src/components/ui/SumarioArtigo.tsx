import clsx from 'clsx'
import { agruparSecoes, extrairSecoesDoCorpo } from './secoesDoArtigo'
import type { ItemSumarioArtigo } from './secoesDoArtigo'
import { useSecaoAtual } from './useSecaoAtual'

export interface SumarioArtigoProps {
  corpo: string
  /** Falso quando quem envolve o sumário já o intitula (o `<summary>` do `<details>` no celular). */
  mostrarTitulo?: boolean
  className?: string
}

const ESTILO_POR_NIVEL: Record<2 | 3, { base: string; atual: string; comum: string }> = {
  2: {
    base: 'pl-3 text-sm font-semibold',
    atual: 'border-accent text-primary-medium',
    comum: 'border-transparent text-ink',
  },
  // O `-ml-px` põe a barra da seção atual em cima do fio vertical dos subtópicos.
  3: {
    base: '-ml-px pl-3 text-xs',
    atual: 'border-accent font-semibold text-ink',
    comum: 'border-transparent text-muted',
  },
}

function LinkDoSumario({
  item,
  atual,
  nivel,
}: {
  item: ItemSumarioArtigo
  atual: boolean
  nivel: 2 | 3
}) {
  const estilo = ESTILO_POR_NIVEL[nivel]

  return (
    <a
      href={`#${item.ancora}`}
      title={item.titulo}
      aria-current={atual ? 'location' : undefined}
      className={clsx(
        'block border-l-2 py-1 leading-snug hover:underline',
        estilo.base,
        atual ? estilo.atual : estilo.comum,
      )}
    >
      {/* Corte só visual: o leitor de tela continua lendo o título inteiro. */}
      <span className="line-clamp-2">{item.titulo}</span>
    </a>
  )
}

/**
 * Sumário lateral do artigo. Cada tópico (h2) abre um grupo em negrito; os subtópicos (h3) ficam
 * recuados sobre um fio vertical, menores e mais claros. A seção em leitura ganha a barra laranja.
 */
export function SumarioArtigo({ corpo, mostrarTitulo = true, className }: SumarioArtigoProps) {
  const itens = extrairSecoesDoCorpo(corpo)
  const secaoAtual = useSecaoAtual(itens.map((item) => item.ancora))

  if (itens.length === 0) return null

  return (
    <nav aria-label="Sumário do artigo" className={className}>
      {mostrarTitulo && (
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Nesta página</p>
      )}
      <ul className={clsx('flex flex-col gap-2', mostrarTitulo && 'mt-3')}>
        {agruparSecoes(itens).map((topico) => (
          <li key={topico.ancora}>
            <LinkDoSumario
              item={topico}
              nivel={topico.nivel}
              atual={topico.ancora === secaoAtual}
            />
            {topico.subtopicos.length > 0 && (
              <ul className="mt-1 ml-3 flex flex-col border-l border-line">
                {topico.subtopicos.map((subtopico) => (
                  <li key={subtopico.ancora}>
                    <LinkDoSumario
                      item={subtopico}
                      nivel={3}
                      atual={subtopico.ancora === secaoAtual}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
