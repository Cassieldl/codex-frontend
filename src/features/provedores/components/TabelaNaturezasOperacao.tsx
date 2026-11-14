import { Info } from 'lucide-react'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../components/ui/Table'
import type { NaturezaOperacaoPublica } from '../types/versaoProvedorPagina'

export interface TabelaNaturezasOperacaoProps {
  naturezas: NaturezaOperacaoPublica[]
}

function NotaDaNatureza({ natureza }: { natureza: NaturezaOperacaoPublica }) {
  if (!natureza.observacao && !natureza.aConfirmar) return null

  return (
    <p data-nota-natureza="" className="mt-0.5 flex items-start gap-1.5 text-muted">
      <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {natureza.aConfirmar && (
          <span className="mr-2 inline-block rounded-full border border-border px-2 text-xs font-semibold text-ink">
            A confirmar
          </span>
        )}
        {natureza.observacao}
      </span>
    </p>
  )
}

/**
 * O de-para do `natOp` como conversão: "código no InvoiCy → valor do provedor", com a descrição
 * ao lado. A observação vira nota embaixo da descrição, só na linha que tem.
 */
export function TabelaNaturezasOperacao({ naturezas }: TabelaNaturezasOperacaoProps) {
  return (
    <TableRoot rotulo="De-para da natureza da operação">
      <TableHeader>
        <tr className="h-9">
          <TableCell header className="w-40 text-left">
            <span aria-hidden="true">InvoiCy → Provedor</span>
            <span className="sr-only">Código no InvoiCy e valor no layout do provedor</span>
          </TableCell>
          <TableCell header className="text-left">
            Descrição
          </TableCell>
        </tr>
      </TableHeader>
      <tbody>
        {naturezas.map((natureza) => (
          <TableRow key={natureza.codigoInvoicy} className="align-top">
            <TableCell className="font-mono">
              <span className="inline-grid grid-cols-[2.5rem_1.25rem_minmax(2.5rem,auto)] items-baseline">
                <span data-codigo-invoicy="" className="text-right font-semibold">
                  {natureza.codigoInvoicy}
                </span>
                <span aria-hidden="true" className="text-center text-muted">
                  →
                </span>
                <span className="sr-only"> vira </span>
                <span data-valor-provedor="">{natureza.valorProvedor}</span>
              </span>
            </TableCell>
            <TableCell>
              {natureza.descricao}
              <NotaDaNatureza natureza={natureza} />
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </TableRoot>
  )
}
