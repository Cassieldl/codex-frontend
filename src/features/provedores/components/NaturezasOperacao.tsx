import { ArrowRight } from 'lucide-react'
import type { GrupoCampoVersao, NaturezaOperacaoPublica } from '../types/versaoProvedorPagina'
import { destinoDaNaturezaOperacao } from '../utils/naturezaOperacao'
import { CLASSE_DO_CODIGO, TabelaNaturezasOperacao } from './TabelaNaturezasOperacao'

export const ID_SECAO_NATUREZA_OPERACAO = 'natureza-da-operacao'

export interface NaturezasOperacaoProps {
  naturezas: NaturezaOperacaoPublica[]
  /** Os campos da versão: o destino do `natOp` sai do campo, não da tabela. */
  camposPorGrupo: GrupoCampoVersao[]
}

/** Seção "Natureza da operação" da versão: o de-para do `natOp` para o layout do provedor. */
export function NaturezasOperacao({ naturezas, camposPorGrupo }: NaturezasOperacaoProps) {
  if (naturezas.length === 0) return null

  const destino = destinoDaNaturezaOperacao(camposPorGrupo)

  return (
    <section
      id={ID_SECAO_NATUREZA_OPERACAO}
      aria-labelledby={`${ID_SECAO_NATUREZA_OPERACAO}-titulo`}
      className="flex scroll-mt-24 flex-col gap-3"
    >
      <h2
        id={`${ID_SECAO_NATUREZA_OPERACAO}-titulo`}
        className="text-subtitulo font-semibold text-ink"
      >
        Natureza da operação
      </h2>

      <p
        data-abertura-natureza=""
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink"
      >
        {/* Os espaços entre os itens ficam no texto: a leitura e a cópia não grudam as palavras. */}
        <span>Envie em</span> <code className={CLASSE_DO_CODIGO}>natOp</code>{' '}
        <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted" />{' '}
        {destino ? (
          <>
            <span>o provedor recebe em</span>{' '}
            <code className={CLASSE_DO_CODIGO}>{destino.tag}</code>
            {destino.grupo && (
              <>
                {' '}
                <span className="text-muted">(grupo {destino.grupo})</span>
              </>
            )}
          </>
        ) : (
          <span>o InvoiCy converte para o valor do provedor</span>
        )}
      </p>

      <p className="max-w-[70ch] text-xs text-muted">
        O código é o da tabela unificada do InvoiCy, que faz a conversão. Código fora desta tabela
        não tem conversão neste provedor, e o município pode aceitar menos códigos: confira em
        Painel de Controle, NFS-e, Natureza da Operação.
      </p>

      <TabelaNaturezasOperacao naturezas={naturezas} />
    </section>
  )
}
