import { ArrowRight } from 'lucide-react'
import type { GrupoCampoVersao, NaturezaOperacaoPublica } from '../types/versaoProvedorPagina'
import { destinoDaNaturezaOperacao } from '../utils/naturezaOperacao'
import { TabelaNaturezasOperacao } from './TabelaNaturezasOperacao'

export const ID_SECAO_NATUREZA_OPERACAO = 'natureza-da-operacao'

export interface NaturezasOperacaoProps {
  naturezas: NaturezaOperacaoPublica[]
  /** Os campos da versão: o destino do `natOp` sai do campo, não da tabela. */
  camposPorGrupo: GrupoCampoVersao[]
}

const CLASSE_PASSO = 'flex flex-col gap-1 rounded-xl border border-line px-4 py-3'

const CLASSE_ROTULO_DO_PASSO = 'text-xs font-bold tracking-wider text-primary-medium uppercase'

/** Seção "Natureza da operação" da versão: o de-para do `natOp` para o layout do provedor. */
export function NaturezasOperacao({ naturezas, camposPorGrupo }: NaturezasOperacaoProps) {
  if (naturezas.length === 0) return null

  const destino = destinoDaNaturezaOperacao(camposPorGrupo)

  return (
    <section
      id={ID_SECAO_NATUREZA_OPERACAO}
      aria-labelledby={`${ID_SECAO_NATUREZA_OPERACAO}-titulo`}
      className="flex scroll-mt-24 flex-col gap-5"
    >
      <h2 id={`${ID_SECAO_NATUREZA_OPERACAO}-titulo`} className="sr-only">
        Natureza da operação
      </h2>

      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-card">
        <h3 className="text-card-titulo font-bold text-primary">
          Como a natureza chega ao provedor
        </h3>

        {/* Os espaços entre os itens ficam no texto: a leitura e a cópia não grudam as palavras. */}
        <ol
          data-abertura-natureza=""
          className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center"
        >
          <li className={CLASSE_PASSO}>
            <span className={CLASSE_ROTULO_DO_PASSO}>Você envia</span>{' '}
            <code className="font-mono text-sm font-bold text-ink">natOp</code>{' '}
          </li>
          <li aria-hidden="true" className="hidden justify-center sm:flex">
            <ArrowRight className="size-5 text-primary-light" />
          </li>
          <li className={`${CLASSE_PASSO} border-transparent bg-alert-info`}>
            <span className={CLASSE_ROTULO_DO_PASSO}>InvoiCy converte</span>{' '}
            <span className="text-sm font-semibold text-ink">Tabela unificada</span>{' '}
          </li>
          <li aria-hidden="true" className="hidden justify-center sm:flex">
            <ArrowRight className="size-5 text-primary-light" />
          </li>
          <li className={CLASSE_PASSO}>
            <span className={CLASSE_ROTULO_DO_PASSO}>Provedor recebe</span>{' '}
            {destino ? (
              <span>
                <code className="font-mono text-sm font-bold text-ink">{destino.tag}</code>
                {destino.grupo && (
                  <span className="text-xs text-muted"> (grupo {destino.grupo})</span>
                )}
              </span>
            ) : (
              <span className="text-sm text-ink">o valor do provedor</span>
            )}
          </li>
        </ol>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-card">
        <TabelaNaturezasOperacao naturezas={naturezas} />
      </div>
    </section>
  )
}
