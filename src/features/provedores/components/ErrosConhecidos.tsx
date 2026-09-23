import { Link, type LinkProps } from '@tanstack/react-router'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import type { ErroResumoPublico } from '../types/versaoProvedorPagina'

export interface ErrosConhecidosProps {
  resumo: { total: number; itens: ErroResumoPublico[] }
  provedorSlug: string
}

/**
 * "Erros conhecidos" (§7.6.3) — top 20 por relevância (`errosResumo.itens`);
 * o restante via link para `/erros?provedor={slug}`.
 *
 * `erro.url` vem da API — `caminhoInternoSeguro` valida antes de virar sink
 * de navegação (BAIXO-02, defesa em profundidade); se não passar, o item
 * renderiza só o texto, sem link.
 */
export function ErrosConhecidos({ resumo, provedorSlug }: ErrosConhecidosProps) {
  if (resumo.itens.length === 0) return null

  return (
    <section aria-labelledby="erros-conhecidos-titulo" className="flex flex-col gap-3">
      <h2 id="erros-conhecidos-titulo" className="text-subtitulo font-semibold text-ink">
        Erros conhecidos
      </h2>

      <ul className="flex flex-col gap-2">
        {resumo.itens.map((erro) => {
          const caminho = caminhoInternoSeguro(erro.url)
          const conteudo = (
            <>
              <span className="shrink-0 font-mono text-xs text-muted">{erro.codigo}</span>
              <span className="text-sm text-ink">{erro.titulo}</span>
            </>
          )

          return (
            <li key={erro.codigo}>
              {caminho ? (
                <Link
                  to={caminho as unknown as LinkProps['to']}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border px-4 py-3 hover:shadow-hover"
                >
                  {conteudo}
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border px-4 py-3">
                  {conteudo}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {resumo.total > resumo.itens.length && (
        <Link
          to="/erros"
          search={{ provedor: provedorSlug } as unknown as LinkProps['search']}
          className="text-sm font-semibold text-primary-medium hover:underline"
        >
          Ver todos os {resumo.total} erros
        </Link>
      )}
    </section>
  )
}
