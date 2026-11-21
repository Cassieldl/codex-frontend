import { cn } from '../../lib/cn'
import { agruparSecoes, extrairSecoesDoCorpo } from './secoesDoArtigo'
import type { ItemSumarioArtigo } from './secoesDoArtigo'
import { useSecaoAtual } from './useSecaoAtual'

export interface SumarioArtigoProps {
  corpo: string
  /** Falso quando quem envolve o sumário já o intitula (o `<summary>` do `<details>` no celular). */
  mostrarTitulo?: boolean
  className?: string
}

// O subtópico só recua mais e diminui a letra.
const ESTILO_POR_NIVEL: Record<2 | 3, string> = {
  2: 'px-3 text-sm',
  3: 'pr-3 pl-6 text-xs',
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
      title={item.titulo}
      aria-current={atual ? 'location' : undefined}
      className={cn(
        'block rounded-[var(--radius-control)] py-1.5 leading-snug hover:underline',
        ESTILO_POR_NIVEL[nivel],
        atual ? 'bg-alert-info font-semibold text-primary' : 'text-muted',
      )}
    >
      {/* Corte só visual: o leitor de tela continua lendo o título inteiro. */}
      <span className="line-clamp-2">{item.titulo}</span>
    </a>
  )
}

/**
 * Sumário lateral do artigo. Os subtópicos (h3) ficam recuados sob o tópico (h2), com letra menor.
 * A seção em leitura ganha fundo azul suave e negrito.
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
      <ul className={cn('flex flex-col gap-1', mostrarTitulo && 'mt-3')}>
        {agruparSecoes(itens).map((topico) => (
          <li key={topico.ancora}>
            <LinkDoSumario
              item={topico}
              nivel={topico.nivel}
              atual={topico.ancora === secaoAtual}
            />
            {topico.subtopicos.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1">
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
