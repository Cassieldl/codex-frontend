import { createFileRoute } from '@tanstack/react-router'
import { ArtigoDetalhePage } from '../features/artigos/routes/artigo-detalhe'
import { SLUG_COMO_FUNCIONA } from '../features/artigos/utils/slugsReservados'
import { useNavegarParaCanonica } from '../hooks/useNavegarParaCanonica'

/**
 * Tela 9 - artigo em posição fixa (D2). Não é uma página própria: é a mesma
 * `ArtigoDetalhePage` da tela 8 com o slug reservado, `reservado` ligado só
 * para escolher a variante de 404 (§4).
 */
export const Route = createFileRoute('/como-funciona')({
  component: RouteComponent,
})

function RouteComponent() {
  const navegar = useNavegarParaCanonica()

  return (
    <ArtigoDetalhePage
      artigoSlug={SLUG_COMO_FUNCIONA}
      caminhoAtual="/como-funciona"
      reservado
      navegar={navegar}
    />
  )
}
