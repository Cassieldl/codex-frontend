import { TableCell, TableHeader, TableRoot, TableRow } from '../../../components/ui/Table'
import type { NaturezaOperacaoPublica } from '../types/versaoProvedorPagina'

export interface TabelaNaturezasOperacaoProps {
  naturezas: NaturezaOperacaoPublica[]
}

/** Tabela do de-para: código do InvoiCy, descrição, valor no layout do provedor e observação. */
export function TabelaNaturezasOperacao({ naturezas }: TabelaNaturezasOperacaoProps) {
  const temObservacao = naturezas.some((natureza) => natureza.observacao || natureza.aConfirmar)

  return (
    <TableRoot rotulo="De-para da natureza da operação">
      <TableHeader>
        <tr className="h-9">
          <TableCell header className="w-28 text-left">
            Código no InvoiCy
          </TableCell>
          <TableCell header className="text-left">
            Descrição
          </TableCell>
          <TableCell header className="w-32 text-left">
            Valor no layout do provedor
          </TableCell>
          {temObservacao && (
            <TableCell header className="text-left">
              Observação
            </TableCell>
          )}
        </tr>
      </TableHeader>
      <tbody>
        {naturezas.map((natureza) => (
          <TableRow key={natureza.codigoInvoicy}>
            <TableCell className="font-mono font-semibold">{natureza.codigoInvoicy}</TableCell>
            <TableCell>{natureza.descricao}</TableCell>
            <TableCell className="font-mono">{natureza.valorProvedor}</TableCell>
            {temObservacao && (
              <TableCell className="text-muted">
                {natureza.aConfirmar && (
                  <span className="mr-2 inline-block rounded-full border border-border px-2 text-xs font-semibold text-ink">
                    A confirmar
                  </span>
                )}
                {natureza.observacao}
              </TableCell>
            )}
          </TableRow>
        ))}
      </tbody>
    </TableRoot>
  )
}
