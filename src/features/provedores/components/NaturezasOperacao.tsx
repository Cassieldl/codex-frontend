import type { GrupoCampoVersao, NaturezaOperacaoPublica } from '../types/versaoProvedorPagina'
import { destinoDaNaturezaOperacao } from '../utils/naturezaOperacao'
import { TabelaNaturezasOperacao } from './TabelaNaturezasOperacao'

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

      <p className="text-sm text-ink">
        Envie no campo <code className="font-mono text-xs">natOp</code> o código da tabela unificada
        do InvoiCy. O InvoiCy converte para o valor do layout do provedor
        {destino ? (
          <>
            {' '}
            e envia na tag <code className="font-mono text-xs">{destino}</code>.
          </>
        ) : (
          '.'
        )}
      </p>

      <TabelaNaturezasOperacao naturezas={naturezas} />

      <p className="text-xs text-muted">
        Código fora desta tabela não tem conversão neste provedor. O município pode aceitar menos
        códigos: confira em Painel de Controle, NFS-e, Natureza da Operação.
      </p>
    </section>
  )
}
