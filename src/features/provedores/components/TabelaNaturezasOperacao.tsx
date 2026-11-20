import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { AlertaMigrate } from '../../../components/ui/AlertaMigrate'
import type { NaturezaOperacaoPublica } from '../types/versaoProvedorPagina'
import { codigosEquivalentesNoProvedor } from '../utils/naturezaOperacao'

export interface TabelaNaturezasOperacaoProps {
  naturezas: NaturezaOperacaoPublica[]
}

const CLASSE_BASE_DO_CODIGO =
  'inline-flex h-9 min-w-14 items-center justify-center rounded-[var(--radius-control)] px-3 font-mono text-base font-bold tabular-nums'

/** O que a pessoa envia: chip escuro sólido. */
const CLASSE_DO_CODIGO_ENVIADO = `${CLASSE_BASE_DO_CODIGO} bg-primary text-white`

/** O que o provedor recebe: chip contornado, para não confundir os dois lados do de-para. */
const CLASSE_DO_CODIGO_RECEBIDO = `${CLASSE_BASE_DO_CODIGO} border-2 border-primary bg-white text-primary`

const CLASSE_DO_ROTULO_DA_COLUNA =
  'h-10 px-3 text-left text-xs font-bold tracking-wider text-muted uppercase sm:whitespace-nowrap'

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
          <p>Conversão em validação com o provedor.</p>
        </AlertaMigrate>
      )}
    </div>
  )
}

/**
 * O de-para do `natOp`: o código que a pessoa envia, o valor que o provedor recebe e o significado.
 * Observação e pendência ficam numa linha própria, que no celular ocupa a largura toda e a partir
 * de `sm` alinha com o significado: dentro da terceira coluna, a observação ficava com duas
 * palavras por linha em 390 px.
 */
export function TabelaNaturezasOperacao({ naturezas }: TabelaNaturezasOperacaoProps) {
  const equivalentes = useMemo(() => codigosEquivalentesNoProvedor(naturezas), [naturezas])

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-white">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">De-para da natureza da operação</caption>
        <colgroup>
          <col className="w-20 sm:w-32" />
          <col className="w-24 sm:w-40" />
          <col />
        </colgroup>
        <thead className="border-b border-border bg-surface-hover">
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
        {naturezas.map((natureza) => {
          const equivalente = equivalentes.get(natureza.codigoInvoicy)

          return (
            <tbody key={natureza.codigoInvoicy} className="border-t border-border first:border-t-0">
              <tr className="align-top">
                <td className="px-3 py-3">
                  <span data-codigo-invoicy="" className={CLASSE_DO_CODIGO_ENVIADO}>
                    {natureza.codigoInvoicy}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2">
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-primary-light" />
                    <span data-valor-provedor="" className={CLASSE_DO_CODIGO_RECEBIDO}>
                      {natureza.valorProvedor}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3">
                  <p className="pt-1.5 text-base font-bold text-primary">{natureza.descricao}</p>
                  {equivalente !== undefined && (
                    <p data-equivalente="" className="mt-1 text-xs text-muted">
                      Chega ao provedor igual ao código {equivalente}.
                    </p>
                  )}
                </td>
              </tr>
              {(natureza.observacao || natureza.aConfirmar) && (
                <tr>
                  {/* sm:pl = as duas colunas de código (8rem e 10rem) mais o recuo da célula. */}
                  <td colSpan={3} className="px-3 pb-3 sm:pl-[calc(18rem+0.75rem)]">
                    <NotasDaNatureza natureza={natureza} />
                  </td>
                </tr>
              )}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
