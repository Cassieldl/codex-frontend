import clsx from 'clsx'
import { LIMIAR_SECAO_ATUAL_PX, useSecaoAtual } from './useSecaoAtual'

// A seção levada ao topo pelo clique para em `scroll-mt-24` (96 px), às vezes com fração de pixel
// a mais: a folga garante que ela conte como a seção em leitura.
const LIMIAR_COM_FOLGA_PX = LIMIAR_SECAO_ATUAL_PX + 8

export interface SecaoDaBarra {
  /** `id` do elemento da seção na página: é o destino do link e o alvo do acompanhamento. */
  id: string
  rotulo: string
  contador?: number
}

export interface BarraDeSecoesProps {
  secoes: SecaoDaBarra[]
  rotuloAria: string
}

/**
 * Barra de seções presa no topo ao rolar, que marca a seção em leitura. As seções da página usam
 * `scroll-mt-24`, a folga que deixa o título abaixo da barra depois do clique. Outros elementos
 * presos da página descem pela variável `--topo-fixo`, que a página define com a altura da barra.
 */
export function BarraDeSecoes({ secoes, rotuloAria }: BarraDeSecoesProps) {
  const secaoAtual = useSecaoAtual(
    secoes.map((secao) => secao.id),
    LIMIAR_COM_FOLGA_PX,
  )

  if (secoes.length === 0) return null

  return (
    <nav
      aria-label={rotuloAria}
      className="sticky top-0 z-20 -mx-4 flex h-[var(--altura-barra-secoes)] items-center border-b border-line bg-surface-hover px-4 lg:-mx-8 lg:px-8"
    >
      {/* Rolagem horizontal só dentro da barra e sem a barra de rolagem, que somava altura e cortava
          o anel de foco. A folga do `p-1` mantém o anel inteiro dentro da altura fixa. */}
      <ul className="flex min-w-0 flex-1 gap-1 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {secoes.map((secao) => {
          const atual = secao.id === secaoAtual

          return (
            <li key={secao.id} className="shrink-0">
              <a
                href={`#${secao.id}`}
                aria-current={atual ? 'true' : undefined}
                className={clsx(
                  'inline-flex h-9 items-center gap-1.5 border-b-2 px-3 text-sm whitespace-nowrap hover:shadow-hover',
                  atual
                    ? 'border-accent font-semibold text-ink'
                    : 'border-transparent font-normal text-primary-medium',
                )}
              >
                {secao.rotulo}
                {secao.contador !== undefined && (
                  <span className="rounded-[var(--radius-pill)] bg-white px-1.5 text-xs text-ink tabular-nums">
                    {secao.contador}
                  </span>
                )}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
