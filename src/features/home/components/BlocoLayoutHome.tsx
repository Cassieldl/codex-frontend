import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import type { LayoutResumoHome } from '../types/home'

export interface BlocoLayoutHomeProps {
  layout: LayoutResumoHome | null
}

function descreverMudancas(layout: LayoutResumoHome): string | null {
  const partes: string[] = []

  if (layout.camposNovos > 0) {
    partes.push(layout.camposNovos > 1 ? `${layout.camposNovos} campos novos` : '1 campo novo')
  }

  if (layout.camposDescontinuados > 0) {
    partes.push(
      layout.camposDescontinuados > 1
        ? `${layout.camposDescontinuados} descontinuados`
        : '1 descontinuado',
    )
  }

  return partes.length > 0 ? partes.join(' · ') : null
}

/**
 * Resumo do Layout InvoiCy na Home.
 *
 * `layout: null` faz a seção inteira sumir — nunca um "Layout ainda não
 * publicado" que pareça falha. Vocabulário comum sem versão publicada é uma
 * etapa normal do acervo, não um erro a anunciar.
 */
export function BlocoLayoutHome({ layout }: BlocoLayoutHomeProps) {
  if (!layout) return null

  const mudancas = descreverMudancas(layout)

  return (
    <section aria-labelledby="secao-layout-home" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="secao-layout-home" className="text-titulo font-extrabold text-ink">
          Layout InvoiCy
        </h2>
        <p className="max-w-3xl text-sm text-muted">
          O vocabulário comum: nome, caminho e significado de cada campo. Tipo, tamanho, máscara e
          obrigatoriedade são definidos por provedor.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-8 border-y border-line px-4 py-7">
        <div className="flex min-w-[170px] shrink-0 flex-col gap-1">
          {layout.vigente ? (
            // Sem data de publicação: o contrato não a tem (B-6), e o artboard a pedia.
            // Mesma decisão que a tela 6 tomou — a versão vigente se identifica pelo rótulo.
            <span className="text-h1 font-extrabold leading-tight text-ink">
              {formatarVersaoLayout(layout.vigente.rotulo, { maiuscula: true })}
            </span>
          ) : (
            <span className="text-card-titulo font-semibold text-ink">Nenhuma versão vigente</span>
          )}

          {layout.prevista && (
            <span className="mt-2.5 self-start rounded-[var(--radius-pill)] border border-dashed border-border px-2.5 py-0.5 text-xs text-muted">
              {formatarVersaoLayout(layout.prevista.rotulo, { maiuscula: true })} prevista
            </span>
          )}
        </div>

        <div className="flex min-w-[300px] flex-1 flex-col gap-2">
          {layout.descricao && (
            <p className="max-w-[60ch] text-sm text-muted">{layout.descricao}</p>
          )}
          {mudancas && <p className="text-xs font-medium text-ink">{mudancas}</p>}
        </div>

        <Link
          to="/layout"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold text-primary-medium hover:underline"
        >
          Ver detalhes
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
