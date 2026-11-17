import { Link } from '@tanstack/react-router'
import { SeloVerificacao } from '../../../components/ui/SeloVerificacao'
import { ehTextoDeFonte } from '../../../components/ui/blocosDoArtigo'
import type { ArtigoListaItem } from '../types/artigo'
import { EtiquetaTipoArtigo } from './EtiquetaTipoArtigo'

export interface CardArtigoProps {
  artigo: ArtigoListaItem
  /**
   * Esconde o par glifo+rótulo do tipo quando a lista já está filtrada por
   * ele (a aba ativa diz o tipo, repetir em toda linha é ruído).
   */
  mostrarTipo?: boolean
}

/**
 * Item do índice de artigos (tela 7). O título manda, o resumo respira e o
 * selo de verificação fica subordinado: artigo não tem prazo nem vigência: a
 * única data da tela é a verificação.
 */
export function CardArtigo({ artigo, mostrarTipo = true }: CardArtigoProps) {
  return (
    <article className="flex flex-col gap-2 border-b border-line px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1.5">
        {mostrarTipo && <EtiquetaTipoArtigo tipo={artigo.tipo} />}

        <h2 className="text-card-titulo font-semibold">
          <Link
            to="/artigos/$artigoSlug"
            params={{ artigoSlug: artigo.slug }}
            className="text-primary-medium hover:underline"
          >
            {artigo.titulo}
          </Link>
        </h2>

        {/* Resumo que é só a citação da fonte não diz do que o artigo trata: fica só o título. */}
        {artigo.resumo && !ehTextoDeFonte(artigo.resumo) && (
          <p className="max-w-2xl text-sm text-muted">{artigo.resumo}</p>
        )}
      </div>

      {artigo.verificadoEm && (
        <SeloVerificacao data={artigo.verificadoEm} className="shrink-0 sm:w-44 sm:justify-end" />
      )}
    </article>
  )
}
