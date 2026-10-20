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

function LinkDoSumario({
  item,
  atual,
  nivel,
}: {
  item: ItemSumarioArtigo
  atual: boolean
  nivel: 2 | 3
}) {
  return (
    <a
      href={`#${item.ancora}`}
      aria-current={atual ? 'location' : undefined}
      className={clsx(
        // A barra de 2 px cobre a linha-guia da lista (`-ml-px`): a seção atual fica marcada na
        // própria guia, com o acento laranja de estado ativo.
        '-ml-px block border-l-2 py-1 leading-snug hover:underline',
        nivel === 2 ? 'pl-3 text-sm' : 'pl-6 text-xs',
        atual
          ? 'border-accent font-semibold text-ink'
          : nivel === 2
            ? 'border-transparent text-ink/80'
            : 'border-transparent text-muted',
      )}
    >
      {item.titulo}
    </a>
  )
}

/**
 * Sumário lateral do artigo: tópicos (h2) e subtópicos (h3) numa lista aninhada, sobre uma
 * linha-guia. O subtópico fica mais recuado, menor e mais claro; a seção em leitura é marcada.
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
      <ul className={clsx('flex flex-col border-l border-line', mostrarTitulo && 'mt-3')}>
        {agruparSecoes(itens).map((topico) => (
          <li key={topico.ancora}>
            <LinkDoSumario
              item={topico}
              nivel={topico.nivel}
              atual={topico.ancora === secaoAtual}
            />
            {topico.subtopicos.length > 0 && (
              <ul>
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
