import { Fragment } from 'react'
import type { TrechoResultado } from '../types/resultadoBusca'

export interface TrechosDestacadosProps {
  trechos: TrechoResultado[]
}

/**
 * Renderiza os fragmentos estruturados da busca (D11) com `<mark>` só nos
 * trechos marcados como destacados. **Nunca** `dangerouslySetInnerHTML` — a
 * API devolve fragmentos justamente para eliminar essa tentação.
 */
export function TrechosDestacados({ trechos }: TrechosDestacadosProps) {
  return (
    <>
      {trechos.map((trecho, indice) => (
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
