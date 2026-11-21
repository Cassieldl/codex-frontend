import { cn } from '../../lib/cn'

export interface EntradaDoIndice {
  raiz: string
  rotulo: string
  /** Campos do bloco que passam no filtro atual. */
  quantidadeVisivel: number
  /** Campos novos nesta versão: com mais de zero, o selo "+N". */
  novos?: number
}

export interface IndiceDeBlocosProps {
  entradas: EntradaDoIndice[]
  onIrParaBloco: (raiz: string) => void
  /** Bloco em leitura: fundo azul suave, negrito e `aria-current`. */
  raizAtual?: string | null
  /** Título da lista, como "24 blocos". */
  titulo?: string
}

const CLASSE_DA_ENTRADA =
  'flex items-baseline justify-between gap-2 rounded-[var(--radius-control)] border-b border-border px-2 py-1.5 text-sm'

const CLASSE_DO_LINK = `${CLASSE_DA_ENTRADA} hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover`

const CLASSE_DO_LINK_ATUAL = 'bg-alert-info font-semibold text-primary'

function descreverQuantidade(quantidade: number): string {
  return quantidade === 1 ? 'campo' : 'campos'
}

/**
 * Índice lateral dos blocos do layout. Bloco sem campo no filtro atual continua listado, com
 * contagem 0, mas deixa de ser link: não há para onde levar.
 */
export function IndiceDeBlocos({
  entradas,
  onIrParaBloco,
  raizAtual = null,
  titulo = 'Blocos',
}: IndiceDeBlocosProps) {
  return (
    <nav
      aria-label="Blocos do layout"
      className="sticky top-[calc(var(--topo-fixo,0px)_+_1rem)] max-h-[calc(100vh_-_var(--topo-fixo,0px)_-_2rem)] overflow-y-auto"
    >
      <p className="px-2 pb-1 text-aux font-semibold tracking-wide text-muted uppercase">
        {titulo}
      </p>

      <ul>
        {entradas.map(({ raiz, rotulo, quantidadeVisivel, novos = 0 }) => {
          const conteudo = (
            <>
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{rotulo}</span>{' '}
              {novos > 0 && (
                <>
                  <span className="shrink-0 rounded-[var(--radius-pill)] bg-alert-success px-1.5 text-aux font-bold text-alert-success-texto tabular-nums">
                    +{novos}
                  </span>{' '}
                  <span className="sr-only">{novos === 1 ? 'novo' : 'novos'}</span>{' '}
                </>
              )}
              <span className="tabular-nums">{quantidadeVisivel}</span>{' '}
              <span className="sr-only">{descreverQuantidade(quantidadeVisivel)}</span>
            </>
          )

          const ehAtual = raiz === raizAtual

          return (
            <li key={raiz}>
              {quantidadeVisivel > 0 ? (
                <a
                  href={`#bloco-${raiz}`}
                  aria-current={ehAtual ? 'location' : undefined}
                  onClick={(evento) => {
                    evento.preventDefault()
                    onIrParaBloco(raiz)
                  }}
                  className={cn(
                    CLASSE_DO_LINK,
                    ehAtual ? CLASSE_DO_LINK_ATUAL : 'font-medium text-primary-medium',
                  )}
                >
                  {conteudo}
                </a>
              ) : (
                <span className={`${CLASSE_DA_ENTRADA} font-medium text-muted`}>{conteudo}</span>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
