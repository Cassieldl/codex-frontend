import { AlertaMigrate } from '../../../components/ui/AlertaMigrate'
import type { NaturezaOperacaoPublica } from '../types/versaoProvedorPagina'

export interface TabelaNaturezasOperacaoProps {
  naturezas: NaturezaOperacaoPublica[]
}

/** Código em destaque, no mesmo desenho da tag do provedor na tabela de campos. */
export const CLASSE_DO_CODIGO =
  'inline-flex min-w-8 items-center justify-center rounded-[var(--radius-pill)] border border-border-control bg-white px-2 py-px font-mono text-[13px] font-semibold text-ink tabular-nums'

const CLASSE_DO_ROTULO_DA_COLUNA = 'h-8 px-3 text-left text-xs font-medium text-muted'

function NotasDaNatureza({ natureza }: { natureza: NaturezaOperacaoPublica }) {
  if (!natureza.observacao && !natureza.aConfirmar) return null

  return (
    <div data-nota-natureza="" className="flex flex-col gap-1.5">
      {natureza.observacao && (
        <AlertaMigrate tipo="informacao" titulo="Observação" compacto>
          <p>{natureza.observacao}</p>
        </AlertaMigrate>
      )}
      {natureza.aConfirmar && (
        <AlertaMigrate tipo="alerta" titulo="A confirmar" compacto>
          <p>Conversão ainda não confirmada na fonte do provedor.</p>
        </AlertaMigrate>
      )}
    </div>
  )
}

/**
 * O de-para do `natOp` no desenho da tabela de campos: o código que a pessoa envia, o valor que o
 * provedor recebe e o significado. Observação e pendência viram alerta numa linha própria, que no
 * celular ocupa a largura toda e a partir de `sm` alinha com o significado: dentro da terceira
 * coluna, a observação ficava com duas palavras por linha em 390 px.
 */
export function TabelaNaturezasOperacao({ naturezas }: TabelaNaturezasOperacaoProps) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-white">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">De-para da natureza da operação</caption>
        <colgroup>
          <col className="w-20 sm:w-28" />
          <col className="w-20 sm:w-28" />
          <col />
        </colgroup>
        <thead className="border-b border-line bg-white">
          <tr>
            <th scope="col" className={CLASSE_DO_ROTULO_DA_COLUNA}>
              Você envia
            </th>
            <th scope="col" className={CLASSE_DO_ROTULO_DA_COLUNA}>
              Provedor recebe
            </th>
            <th scope="col" className={CLASSE_DO_ROTULO_DA_COLUNA}>
              Significado
            </th>
          </tr>
        </thead>
        {naturezas.map((natureza) => (
          <tbody key={natureza.codigoInvoicy} className="border-t border-line first:border-t-0">
            <tr className="align-top">
              <td className="px-3 py-2">
                <span data-codigo-invoicy="" className={CLASSE_DO_CODIGO}>
                  {natureza.codigoInvoicy}
                </span>
              </td>
              <td className="px-3 py-2">
                <span data-valor-provedor="" className={CLASSE_DO_CODIGO}>
                  {natureza.valorProvedor}
                </span>
              </td>
              <td className="px-3 py-2 text-sm text-ink">{natureza.descricao}</td>
            </tr>
            {(natureza.observacao || natureza.aConfirmar) && (
              <tr>
                {/* sm:pl = as duas colunas de código (w-28 cada) mais o recuo da célula. */}
                <td colSpan={3} className="px-3 pb-2 sm:pl-[calc(14rem+0.75rem)]">
                  <NotasDaNatureza natureza={natureza} />
                </td>
              </tr>
            )}
          </tbody>
        ))}
      </table>
    </div>
  )
}
