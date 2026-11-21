import { format } from 'date-fns'
import { cn } from '../../../lib/cn'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import { diasAteObrigatoria, rotuloDiasRestantes } from '../../home/utils/diasAteObrigatoria'
import type { MarcosDaVersaoLayout } from '../types/layoutPublico'
import { montarLinhaDoTempo } from '../utils/marcosDaVersao'
import type { LinhaDoTempoDaVersao, MarcoDaVersao } from '../utils/marcosDaVersao'

export interface MarcosDaVersaoProps {
  versaoRotulo: string
  marcos: Partial<MarcosDaVersaoLayout>
  /** Injetável para o teste não depender do relógio. */
  hoje?: Date
  /**
   * `versao` abre com "Versão N · estado" e a origem (hub); `prazo` abre com a data de
   * obrigatoriedade em destaque, porque a página da versão já diz versão e origem no cabeçalho.
   */
  destaque?: 'versao' | 'prazo'
  /** Estado por extenso, como "vigente". */
  estado?: string
  className?: string
}

type EntradaDaLinha = { tipo: 'marco'; marco: MarcoDaVersao } | { tipo: 'hoje' }

type EstadoDoTrecho = 'passou' | 'hoje' | 'futuro'

const CLASSE_DO_TRECHO: Record<EstadoDoTrecho, string> = {
  passou: 'border-primary-light',
  hoje: 'border-accent',
  futuro: 'border-dashed border-white/50',
}

function entradasDaLinha({ marcos, posicaoDeHoje }: LinhaDoTempoDaVersao): EntradaDaLinha[] {
  const entradas: EntradaDaLinha[] = marcos.map((marco) => ({ tipo: 'marco', marco }))
  entradas.splice(posicaoDeHoje, 0, { tipo: 'hoje' })
  return entradas
}

function estadoDoTrecho(entrada: EntradaDaLinha): EstadoDoTrecho {
  if (entrada.tipo === 'hoje') return 'hoje'
  return entrada.marco.passou ? 'passou' : 'futuro'
}

interface BarraDoTempoProps {
  linhaDoTempo: LinhaDoTempoDaVersao
  hoje: Date
  versao: string
}

/**
 * Linha do tempo em barra contínua: cada entrada ocupa uma coluna e o traço acima dela diz se o
 * trecho já passou, é hoje ou ainda vem. Em tela estreita o traço fica à esquerda.
 */
function BarraDoTempo({ linhaDoTempo, hoje, versao }: BarraDoTempoProps) {
  return (
    <ol aria-label={`Prazos da ${versao}`} className="grid gap-2 sm:auto-cols-fr sm:grid-flow-col">
      {entradasDaLinha(linhaDoTempo).map((entrada) => {
        const ehHoje = entrada.tipo === 'hoje'

        return (
          <li
            key={ehHoje ? 'hoje' : entrada.marco.chave}
            data-marco={ehHoje ? undefined : entrada.marco.chave}
            aria-current={ehHoje ? 'date' : undefined}
            className={cn(
              'flex min-w-0 flex-col gap-1 border-l-4 py-1 pl-3 sm:border-t-4 sm:border-l-0 sm:pt-3 sm:pr-3 sm:pl-0',
              CLASSE_DO_TRECHO[estadoDoTrecho(entrada)],
            )}
          >
            <span className={cn('text-xs', ehHoje ? 'font-semibold text-accent' : 'text-white')}>
              {ehHoje ? 'Hoje' : entrada.marco.rotulo}
            </span>
            <time
              dateTime={ehHoje ? format(hoje, 'yyyy-MM-dd') : entrada.marco.dataIso}
              className="text-sm font-semibold text-white tabular-nums"
            >
              {ehHoje ? format(hoje, 'dd/MM/yyyy') : entrada.marco.texto}
            </time>
          </li>
        )
      })}
    </ol>
  )
}

function SeloDiasRestantes({ obrigatoriaEm, hoje }: { obrigatoriaEm: string | null; hoje: Date }) {
  const dias = diasAteObrigatoria(obrigatoriaEm, hoje)
  if (dias === null) return null

  return (
    <span
      data-dias-restantes=""
      className="self-start rounded-[var(--radius-pill)] bg-accent px-3 py-0.5 text-xs font-bold text-primary"
    >
      {rotuloDiasRestantes(dias)}
    </span>
  )
}

/**
 * Faixa escura com a origem normativa e os prazos de uma versão do layout, para responder "de onde
 * veio" e "quando vira obrigatória" sem texto corrido. Marco sem data some sozinho; sem nada a
 * mostrar, a faixa inteira some. "Faltam N dias" aparece só enquanto o prazo não chegou.
 */
export function MarcosDaVersao({
  versaoRotulo,
  marcos,
  hoje = new Date(),
  destaque = 'versao',
  estado = 'vigente',
  className,
}: MarcosDaVersaoProps) {
  const linhaDoTempo = montarLinhaDoTempo(marcos, hoje)
  const normaOrigem = marcos.normaOrigem?.trim() || null
  const destaqueNoPrazo = destaque === 'prazo'

  if (!linhaDoTempo && (!normaOrigem || destaqueNoPrazo)) return null

  const versao = formatarVersaoLayout(versaoRotulo)
  const prazo = linhaDoTempo?.marcos.find((marco) => marco.chave === 'obrigatoriedade')

  return (
    <section
      aria-label={`Origem e prazos da ${versao}`}
      className={cn(
        'grid gap-6 rounded-[var(--radius-card)] bg-primary px-8 py-7 text-white lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-center',
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        {destaqueNoPrazo && prazo ? (
          <>
            <p className="text-xs font-bold tracking-wider text-accent uppercase">
              {prazo.passou ? 'Obrigatória em produção desde' : 'Obrigatória em produção'}
            </p>
            <p className="text-titulo leading-tight font-extrabold tabular-nums">{prazo.texto}</p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold tracking-wider text-accent uppercase">
              {versao} · {estado}
            </p>
            {prazo && (
              <p className="text-subtitulo leading-tight font-extrabold">
                {prazo.passou ? 'Obrigatória em produção desde ' : 'Obrigatória em produção em '}
                {prazo.texto}
              </p>
            )}
          </>
        )}

        <SeloDiasRestantes obrigatoriaEm={marcos.obrigatoriaEm ?? null} hoje={hoje} />

        {!destaqueNoPrazo && normaOrigem && (
          <p className="text-sm">
            Origem <strong data-norma-origem="">{normaOrigem}</strong>
          </p>
        )}
      </div>

      {linhaDoTempo && <BarraDoTempo linhaDoTempo={linhaDoTempo} hoje={hoje} versao={versao} />}
    </section>
  )
}
