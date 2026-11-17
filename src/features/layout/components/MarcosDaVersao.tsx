import clsx from 'clsx'
import { format } from 'date-fns'
import { Fragment } from 'react'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import type { MarcosDaVersaoLayout } from '../types/layoutPublico'
import { montarLinhaDoTempo } from '../utils/marcosDaVersao'
import type { LinhaDoTempoDaVersao, MarcoDaVersao } from '../utils/marcosDaVersao'

export interface MarcosDaVersaoProps {
  versaoRotulo: string
  marcos: Partial<MarcosDaVersaoLayout>
  /** Injetável para o teste não depender do relógio. */
  hoje?: Date
  className?: string
}

type EntradaDaLinha = { tipo: 'marco'; marco: MarcoDaVersao } | { tipo: 'hoje' }

function entradasDaLinha({ marcos, posicaoDeHoje }: LinhaDoTempoDaVersao): EntradaDaLinha[] {
  const entradas: EntradaDaLinha[] = marcos.map((marco) => ({ tipo: 'marco', marco }))
  entradas.splice(posicaoDeHoje, 0, { tipo: 'hoje' })
  return entradas
}

/**
 * Trecho entre duas entradas: cheio quando o tempo até a entrada seguinte já passou. Vertical em
 * tela estreita, onde os rótulos lado a lado se sobrepõem.
 */
function Trilho({ cheio }: { cheio: boolean }) {
  return (
    <li
      aria-hidden="true"
      className={clsx(
        'ml-[5px] h-4 w-0.5 sm:mt-[5px] sm:ml-0 sm:h-0.5 sm:w-auto sm:min-w-6 sm:flex-1 sm:self-start',
        cheio ? 'bg-primary-medium' : 'bg-border',
      )}
    />
  )
}

// Em tela estreita a entrada vira uma linha: ponto, rótulo e data lado a lado.
const CLASSE_DA_ENTRADA =
  'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 sm:flex-col sm:flex-nowrap sm:items-start sm:gap-1'

function ItemDoMarco({ marco }: { marco: MarcoDaVersao }) {
  return (
    <li data-marco={marco.chave} className={CLASSE_DA_ENTRADA}>
      <span
        aria-hidden="true"
        className={clsx(
          'size-3 shrink-0 rounded-full border-2 border-primary-medium',
          marco.passou ? 'bg-primary-medium' : 'bg-white',
        )}
      />
      <span className="text-xs text-muted">{marco.rotulo}</span>
      <time dateTime={marco.dataIso} className="text-sm font-semibold text-ink tabular-nums">
        {marco.texto}
      </time>
    </li>
  )
}

function ItemDeHoje({ hoje }: { hoje: Date }) {
  return (
    <li aria-current="date" className={CLASSE_DA_ENTRADA}>
      <span
        aria-hidden="true"
        className="size-3 shrink-0 rounded-full bg-accent ring-2 ring-white"
      />
      <span className="text-xs font-semibold text-ink">Hoje</span>
      <time dateTime={format(hoje, 'yyyy-MM-dd')} className="text-xs text-muted tabular-nums">
        {format(hoje, 'dd/MM/yyyy')}
      </time>
    </li>
  )
}

/**
 * Origem normativa e prazos de uma versão do layout, para responder "de onde veio" e "quando vira
 * obrigatória" sem texto corrido. Marco sem data some sozinho; sem origem e sem nenhuma data, o
 * bloco inteiro some.
 */
export function MarcosDaVersao({
  versaoRotulo,
  marcos,
  hoje = new Date(),
  className,
}: MarcosDaVersaoProps) {
  const linhaDoTempo = montarLinhaDoTempo(marcos, hoje)
  const normaOrigem = marcos.normaOrigem?.trim() || null

  if (!linhaDoTempo && !normaOrigem) return null

  const versao = formatarVersaoLayout(versaoRotulo)

  return (
    <section
      aria-label={`Origem e prazos da ${versao}`}
      className={clsx(
        'flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-white px-5 py-4',
        className,
      )}
    >
      {normaOrigem && (
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-muted">Origem:</span>
          <strong data-norma-origem="" className="text-card-titulo font-semibold text-ink">
            {normaOrigem}
          </strong>
        </p>
      )}

      {linhaDoTempo && (
        <ol
          aria-label={`Prazos da ${versao}`}
          className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3 sm:overflow-x-auto"
        >
          {entradasDaLinha(linhaDoTempo).map((entrada, indice) => (
            <Fragment key={entrada.tipo === 'hoje' ? 'hoje' : entrada.marco.chave}>
              {indice > 0 && <Trilho cheio={entrada.tipo === 'hoje' || entrada.marco.passou} />}
              {entrada.tipo === 'hoje' ? (
                <ItemDeHoje hoje={hoje} />
              ) : (
                <ItemDoMarco marco={entrada.marco} />
              )}
            </Fragment>
          ))}
        </ol>
      )}
    </section>
  )
}
