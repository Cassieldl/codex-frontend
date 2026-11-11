import { Link } from '@tanstack/react-router'
import { TituloSecao } from '../../../components/ui/TituloSecao'
import { CardArtigo } from '../../artigos/components/CardArtigo'
import type { ArtigoRecenteHome } from '../types/home'

export interface ArtigosRecentesHomeProps {
  artigos: ArtigoRecenteHome[]
}

/**
 * Artigos recentes na Home.
 *
 * `CardArtigo` é **reusado** do índice de artigos (tela 7), não reimplementado:
 * `ArtigoRecenteHome` tem exatamente o shape de `ArtigoListaItem` (P7), e é
 * isso que permite o reuso direto — um gêmeo divergente teria custado um
 * segundo card para manter.
 *
 * Acervo sem artigo nenhum não rende card nem estado vazio: o cabeçalho e o
 * "Ver o índice completo" continuam visíveis, porque o índice existe mesmo
 * quando ainda não há destaque para mostrar.
 */
export function ArtigosRecentesHome({ artigos }: ArtigosRecentesHomeProps) {
  return (
    <section aria-labelledby="secao-artigos-home" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-6">
        <TituloSecao id="secao-artigos-home">Artigos</TituloSecao>
        <Link
          to="/artigos"
          search={{ pagina: 1 }}
          className="text-sm font-semibold text-primary-medium hover:underline"
        >
          Ver o índice completo
        </Link>
      </div>

      {artigos.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-line bg-white shadow-card">
          {artigos.map((artigo) => (
            <CardArtigo key={artigo.slug} artigo={artigo} />
          ))}
        </div>
      )}
    </section>
  )
}
