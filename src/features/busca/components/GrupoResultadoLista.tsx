import { Link, type LinkProps } from '@tanstack/react-router'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import type { GrupoResultado } from '../types/resultadoBusca'
import { formatarMetaResultado } from '../utils/formatarMetaResultado'
import { ResultadoErroGeral } from './ResultadoErroGeral'
import { TrechosDestacados } from './TrechosDestacados'

export interface GrupoResultadoListaProps {
  grupo: GrupoResultado
}

/**
 * Um grupo de resultados agrupado por tipo (§7.1). A ordem dos grupos e dos
 * itens já vem pronta da API (por `pontuacao`) — este componente só renderiza.
 *
 * Cada item é um `<Link>` do TanStack Router — a URL vem da API como string
 * livre (caminho relativo dentro da própria árvore de rotas), por isso o
 * `to` é convertido via `LinkProps['to']` (mesmo padrão de `AbasNavegaveis`).
 * `caminhoInternoSeguro` valida a string antes de virar sink de navegação
 * (BAIXO-02); se ela não passar (defesa em profundidade — não deveria
 * acontecer, o backend garante `Slug`), o item renderiza sem link em vez de
 * produzir um `<Link>` quebrado ou, pior, um redirect externo.
 */
export function GrupoResultadoLista({ grupo }: GrupoResultadoListaProps) {
  const tituloGrupoId = `grupo-resultado-${grupo.tipo}`

  return (
    <section aria-labelledby={tituloGrupoId} className="flex flex-col gap-3">
      <h2 id={tituloGrupoId} className="text-subtitulo font-semibold text-ink">
        {grupo.rotulo} <span className="text-sm font-normal text-ink/50">({grupo.total})</span>
      </h2>

      <ul className="flex flex-col gap-2">
        {grupo.itens.map((item) => {
          const caminho = caminhoInternoSeguro(item.url)
          // `descricaoCasamento` e `meta` agora vivem no item, não no grupo
          // (P1/I21) — mesma posição visual de antes, um ao lado do outro
          // quando os dois existem, só um quando o outro está ausente.
          const legenda = [item.descricaoCasamento, formatarMetaResultado(item.meta)]
            .filter(Boolean)
            .join(' · ')

          const conteudo = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-card-titulo font-medium text-ink">{item.titulo}</span>
                {item.tipo === 'erro' && (
                  <ResultadoErroGeral
                    provedorNome={item.provedorNome}
                    versaoRotulo={item.versaoRotulo}
                    versoes={item.versoes}
                  />
                )}
              </div>

              {legenda && <p className="text-xs text-ink/50">{legenda}</p>}

              <p className="text-sm text-ink/80">
                <TrechosDestacados trechos={item.trechos} />
              </p>
            </>
          )

          return (
            <li key={item.url}>
              {caminho ? (
                <Link
                  to={caminho as unknown as LinkProps['to']}
                  className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-border p-4 hover:shadow-hover"
                >
                  {conteudo}
                </Link>
              ) : (
                <div className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-border p-4">
                  {conteudo}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
