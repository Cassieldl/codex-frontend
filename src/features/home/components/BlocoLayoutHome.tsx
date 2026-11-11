import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Sobrelinha } from '../../../components/ui/Sobrelinha'
import { TituloSecao } from '../../../components/ui/TituloSecao'
import { descreverMudancasDoLayout, ID_NOVIDADES_DO_LAYOUT } from '../../../utils/mudancasDoLayout'
import { lerNotaDaVersaoLayout } from '../../../utils/notaDaVersaoLayout'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import type { LayoutResumoHome } from '../types/home'

export interface BlocoLayoutHomeProps {
  layout: LayoutResumoHome | null
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

  const mudancas = descreverMudancasDoLayout(layout.camposNovos, layout.camposDescontinuados)
  // Só o resumo: os tópicos do que mudou ficam na página do layout.
  const { resumo } = lerNotaDaVersaoLayout(layout.descricao)

  return (
    <section aria-labelledby="secao-layout-home" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <TituloSecao id="secao-layout-home">Layout InvoiCy</TituloSecao>
        <p className="max-w-3xl text-sm text-muted">
          O vocabulário comum: nome, caminho e significado de cada campo. Tipo, tamanho, máscara e
          obrigatoriedade são definidos por provedor.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-8 rounded-[var(--radius-card)] bg-primary px-6 py-7 text-white">
        <div className="flex min-w-[170px] shrink-0 flex-col gap-2">
          <Sobrelinha>{layout.vigente ? 'Versão vigente' : 'Layout InvoiCy'}</Sobrelinha>

          {layout.vigente ? (
            // Sem data de publicação: o contrato não a tem (B-6), e o artboard a pedia.
            // Mesma decisão que a tela 6 tomou — a versão vigente se identifica pelo rótulo.
            <span className="text-h1 leading-tight font-extrabold">
              {formatarVersaoLayout(layout.vigente.rotulo, { maiuscula: true })}
            </span>
          ) : (
            <span className="text-card-titulo font-semibold">Nenhuma versão vigente</span>
          )}

          {layout.prevista && (
            <span className="mt-1 self-start rounded-[var(--radius-pill)] border border-dashed border-white px-2.5 py-0.5 text-xs">
              {formatarVersaoLayout(layout.prevista.rotulo, { maiuscula: true })} prevista
            </span>
          )}
        </div>

        <div className="flex min-w-[300px] flex-1 flex-col items-start gap-3">
          {resumo && <p className="max-w-[60ch] text-sm">{resumo}</p>}
          {mudancas && (
            <span className="rounded-[var(--radius-pill)] bg-accent px-3 py-0.5 text-xs font-bold text-primary">
              {mudancas}
            </span>
          )}
        </div>

        <Link
          to="/layout"
          hash={layout.vigente ? ID_NOVIDADES_DO_LAYOUT : undefined}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-5 text-sm font-semibold text-primary transition-shadow duration-150 hover:shadow-hover"
        >
          {layout.vigente ? 'Ver o que mudou' : 'Ver detalhes'}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
