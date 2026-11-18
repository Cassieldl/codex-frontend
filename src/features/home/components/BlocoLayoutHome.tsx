import { Link } from '@tanstack/react-router'
import { descreverMudancasDoLayout, ID_NOVIDADES_DO_LAYOUT } from '../../../utils/mudancasDoLayout'
import { lerNotaDaVersaoLayout } from '../../../utils/notaDaVersaoLayout'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import { formatarDataDoMarco } from '../../layout/utils/marcosDaVersao'
import type { LayoutResumoHome } from '../types/home'
import { diasAteObrigatoria, rotuloDiasRestantes } from '../utils/diasAteObrigatoria'

export interface BlocoLayoutHomeProps {
  layout: LayoutResumoHome | null
}

function montarTitulo(layout: LayoutResumoHome, obrigatoriaEm: string | null): string {
  if (!layout.vigente) return 'Layout InvoiCy'

  const { rotulo } = layout.vigente

  return obrigatoriaEm
    ? `Layout InvoiCy ${formatarVersaoLayout(rotulo)} obrigatória em ${obrigatoriaEm}`
    : `Layout InvoiCy ${formatarVersaoLayout(rotulo)} vigente`
}

/**
 * Card de destaque do Layout InvoiCy na Home, ao lado dos atalhos de entrada.
 *
 * `layout: null` faz o card sumir, nunca um "Layout ainda não publicado" que pareça falha.
 * O card não é clicável inteiro: a ação é o botão.
 */
export function BlocoLayoutHome({ layout }: BlocoLayoutHomeProps) {
  if (!layout) return null

  const mudancas = descreverMudancasDoLayout(layout.camposNovos, layout.camposDescontinuados)
  // Só o resumo: os tópicos do que mudou ficam na página do layout.
  const { resumo } = lerNotaDaVersaoLayout(layout.descricao)
  const obrigatoriaEm = layout.vigente ? formatarDataDoMarco(layout.obrigatoriaEm) : null
  const diasRestantes = layout.vigente ? diasAteObrigatoria(layout.obrigatoriaEm) : null

  return (
    <section
      aria-labelledby="secao-layout-home"
      className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-primary-medium p-7 text-white shadow-panel"
    >
      {diasRestantes !== null && (
        <span className="self-start rounded-[var(--radius-pill)] bg-accent px-3 py-1 text-xs font-bold text-primary">
          {rotuloDiasRestantes(diasRestantes)}
        </span>
      )}

      <h3 id="secao-layout-home" className="text-subtitulo font-bold">
        {montarTitulo(layout, obrigatoriaEm)}
      </h3>

      {(resumo || mudancas) && (
        <p className="text-sm leading-relaxed text-white">
          {resumo}
          {resumo && mudancas && ' '}
          {mudancas}
        </p>
      )}

      {layout.prevista && (
        <span className="self-start rounded-[var(--radius-pill)] border border-dashed border-white px-2.5 py-0.5 text-xs">
          {formatarVersaoLayout(layout.prevista.rotulo, { maiuscula: true })} prevista
        </span>
      )}

      <Link
        to="/layout"
        hash={layout.vigente ? ID_NOVIDADES_DO_LAYOUT : undefined}
        className="mt-auto inline-flex h-11 items-center self-start rounded-[var(--radius-control)] bg-accent px-5 text-sm font-semibold text-primary transition-shadow duration-150 hover:shadow-hover"
      >
        {layout.vigente ? 'Ver o que mudou' : 'Ver detalhes'}
      </Link>
    </section>
  )
}
