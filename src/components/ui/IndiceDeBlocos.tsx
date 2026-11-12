export interface EntradaDoIndice {
  raiz: string
  rotulo: string
  /** Campos do bloco que passam no filtro atual. */
  quantidadeVisivel: number
}

export interface IndiceDeBlocosProps {
  entradas: EntradaDoIndice[]
  onIrParaBloco: (raiz: string) => void
}

const CLASSE_DA_ENTRADA =
  'flex items-baseline justify-between gap-2 rounded-[var(--radius-control)] border-b border-line px-2 py-1.5 text-sm font-medium'

const CLASSE_DO_LINK = `${CLASSE_DA_ENTRADA} text-primary-medium hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light`

function descreverQuantidade(quantidade: number): string {
  return quantidade === 1 ? 'campo' : 'campos'
}

/**
 * Índice lateral dos blocos do layout. Bloco sem campo no filtro atual continua listado, com
 * contagem 0, mas deixa de ser link: não há para onde levar.
 */
export function IndiceDeBlocos({ entradas, onIrParaBloco }: IndiceDeBlocosProps) {
  return (
    <nav
      aria-label="Blocos do layout"
      className="sticky top-[calc(var(--topo-fixo,0px)_+_1rem)] max-h-[calc(100vh_-_var(--topo-fixo,0px)_-_2rem)] overflow-y-auto"
    >
      <p className="px-2 pb-1 text-aux font-semibold tracking-wide text-muted uppercase">Blocos</p>

      <ul>
        {entradas.map(({ raiz, rotulo, quantidadeVisivel }) => {
          const conteudo = (
            <>
              <span className="min-w-0 [overflow-wrap:anywhere]">{rotulo}</span>{' '}
              <span className="tabular-nums">{quantidadeVisivel}</span>{' '}
              <span className="sr-only">{descreverQuantidade(quantidadeVisivel)}</span>
            </>
          )

          return (
            <li key={raiz}>
              {quantidadeVisivel > 0 ? (
                <a
                  href={`#bloco-${raiz}`}
                  onClick={(evento) => {
                    evento.preventDefault()
                    onIrParaBloco(raiz)
                  }}
                  className={CLASSE_DO_LINK}
                >
                  {conteudo}
                </a>
              ) : (
                <span className={`${CLASSE_DA_ENTRADA} text-muted`}>{conteudo}</span>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
