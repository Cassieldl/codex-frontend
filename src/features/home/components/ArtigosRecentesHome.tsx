import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { ehTextoDeFonte } from '../../../components/ui/blocosDoArtigo'
import { TituloSecao } from '../../../components/ui/TituloSecao'
import { formatarDataCurta } from '../../../utils/formatarDataVerificacao'
import { EtiquetaTipoArtigo } from '../../artigos/components/EtiquetaTipoArtigo'
import type { ArtigoRecenteHome } from '../types/home'

export interface ArtigosRecentesHomeProps {
  artigos: ArtigoRecenteHome[]
}

function CardArtigoHome({ artigo }: { artigo: ArtigoRecenteHome }) {
  return (
    <li>
      <Link
        to="/artigos/$artigoSlug"
        params={{ artigoSlug: artigo.slug }}
        className="flex h-full flex-col gap-2.5 rounded-[var(--radius-card)] border border-line bg-white p-6 text-primary transition-shadow duration-150 hover:border-primary-light hover:shadow-panel"
      >
        <EtiquetaTipoArtigo tipo={artigo.tipo} />
        <span className="text-card-titulo leading-snug font-bold">{artigo.titulo}</span>
        {/* Resumo que é só a citação da fonte não diz do que o artigo trata: fica só o título. */}
        {artigo.resumo && !ehTextoDeFonte(artigo.resumo) && (
          <span className="text-sm leading-relaxed text-muted">{artigo.resumo}</span>
        )}
        {artigo.verificadoEm && (
          <span className="mt-auto pt-2 text-xs text-muted">
            Verificado em {formatarDataCurta(artigo.verificadoEm)}
          </span>
        )}
      </Link>
    </li>
  )
}

/**
 * Artigos recentes na Home, em cards. Acervo sem artigo nenhum não rende card nem estado vazio:
 * o título e o "Ver todos os artigos" continuam, porque o índice existe mesmo sem destaque.
 */
export function ArtigosRecentesHome({ artigos }: ArtigosRecentesHomeProps) {
  return (
    <section aria-labelledby="secao-artigos-home" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <TituloSecao id="secao-artigos-home">Artigos</TituloSecao>
          <p className="text-sm text-muted">O que o suporte explica sempre, escrito uma vez.</p>
        </div>
        <Link
          to="/artigos"
          search={{ pagina: 1 }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary-medium hover:underline"
        >
          Ver todos os artigos
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {artigos.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
          {artigos.map((artigo) => (
            <CardArtigoHome key={artigo.slug} artigo={artigo} />
          ))}
        </ul>
      )}
    </section>
  )
}
