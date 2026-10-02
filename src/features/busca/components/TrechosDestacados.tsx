import { Fragment, useMemo } from 'react'
import type { TrechoResultado } from '../types/resultadoBusca'
import { limparMarcacaoDosTrechos } from '../utils/limparMarcacaoDeTrecho'

export interface TrechosDestacadosProps {
  trechos: TrechoResultado[]
}

/**
 * Renderiza os fragmentos estruturados da busca (D11) com `<mark>` só nos
 * trechos marcados como destacados. **Nunca** `dangerouslySetInnerHTML` — a
 * API devolve fragmentos justamente para eliminar essa tentação.
 *
 * A marcação Markdown sai antes de renderizar: o corpo dos artigos é indexado
 * com a sintaxe, e o `ts_headline` a devolve como está — quem lê um resultado
 * de busca não deveria ver `##` nem `**` na tela.
 */
export function TrechosDestacados({ trechos }: TrechosDestacadosProps) {
  const legiveis = useMemo(() => limparMarcacaoDosTrechos(trechos), [trechos])

  return (
    <>
      {legiveis.map((trecho, indice) => (
        <Fragment key={indice}>
          {trecho.destacado ? (
            <mark className="rounded-sm bg-surface-hover font-semibold text-ink">
              {trecho.texto}
            </mark>
          ) : (
            trecho.texto
          )}
        </Fragment>
      ))}
    </>
  )
}
