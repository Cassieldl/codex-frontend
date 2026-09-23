import type { GrupoResultado } from '../../../busca/types/resultadoBusca'
import { LinhaResultadoBuscaInterna } from './LinhaResultadoBuscaInterna'

export interface ResultadoBuscaInternaListaProps {
  grupos: GrupoResultado[]
}

/**
 * §7.8 — resultados da busca interna agrupados por tipo. Só agrupa: a linha em
 * si (título, estado de publicação, botão de copiar e o saneamento de link)
 * vive em `LinhaResultadoBuscaInterna`, compartilhada com a barra de comando,
 * que exibe a mesma linha em lista plana.
 */
export function ResultadoBuscaInternaLista({ grupos }: ResultadoBuscaInternaListaProps) {
  return (
    <div className="flex flex-col gap-5">
      {grupos.map((grupo) => (
        <section key={grupo.tipo} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">
            {grupo.rotulo} <span className="font-normal text-muted">({grupo.total})</span>
          </h2>
          <ul className="flex flex-col gap-2">
            {grupo.itens.map((item) => (
              <LinhaResultadoBuscaInterna key={item.url} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
