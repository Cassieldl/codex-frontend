import { useParams } from '@tanstack/react-router'
import { useNavegarParaCanonica } from '../../../hooks/useNavegarParaCanonica'
import { ArtigoDetalhePage } from './artigo-detalhe'

/**
 * Liga `/artigos/{artigoSlug}` à página. O caminho atual vem do parâmetro da própria rota, nunca
 * da localização do router, que já é o destino durante uma navegação para fora (ver
 * `provedor-layout-rota.tsx`).
 */
export function ArtigoDetalheRota() {
  const { artigoSlug } = useParams({ from: '/artigos/$artigoSlug' })
  const navegar = useNavegarParaCanonica()

  return (
    <ArtigoDetalhePage
      artigoSlug={artigoSlug}
      caminhoAtual={`/artigos/${artigoSlug}`}
      navegar={navegar}
    />
  )
}
