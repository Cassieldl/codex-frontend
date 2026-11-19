import { Link, type LinkProps } from '@tanstack/react-router'
import { EtiquetaTipoArtigo } from '../../artigos/components/EtiquetaTipoArtigo'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import type { ReferenciaArtigo } from '../types/erro'

export interface ArtigosRelacionadosProps {
  artigos: ReferenciaArtigo[]
}

/**
 * Bloco "Artigos relacionados" da página do erro (§5). Mesmo padrão de
 * `CamposRelacionados`: seção inteira some quando a coleção é vazia — nunca
 * um `<h2>` órfão seguido de nada.
 *
 * Navega com o `url` que o backend já entrega pronto (nunca remonta a rota no
 * cliente), passando pelo filtro de caminho interno como defesa em
 * profundidade (BAIXO-02).
 */
export function ArtigosRelacionados({ artigos }: ArtigosRelacionadosProps) {
  if (artigos.length === 0) return null

  return (
    <section aria-labelledby="artigos-relacionados-titulo" className="flex flex-col gap-3">
      <h2 id="artigos-relacionados-titulo" className="text-subtitulo font-semibold text-ink">
        Artigos relacionados
      </h2>

      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {artigos.map((artigo) => {
          const caminho = caminhoInternoSeguro(artigo.url)

          return (
            <li key={artigo.slug} className="flex flex-col gap-1 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-aux font-semibold tracking-wide text-muted uppercase">
                  {artigo.rotulo}
                </span>
                <EtiquetaTipoArtigo tipo={artigo.tipo} variante="chip" />
              </div>

              {caminho ? (
                <Link
                  to={caminho as unknown as LinkProps['to']}
                  className="text-sm font-medium text-primary-medium hover:underline"
                >
                  {artigo.titulo}
                </Link>
              ) : (
                <span className="text-sm font-medium text-ink">{artigo.titulo}</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
