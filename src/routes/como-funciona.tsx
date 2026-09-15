import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { ArtigoDetalhePage } from '../features/artigos/routes/artigo-detalhe'
import type { NavegarParaCanonica } from '../features/artigos/routes/artigo-detalhe'
import { SLUG_COMO_FUNCIONA } from '../features/artigos/utils/slugsReservados'

/**
 * Tela 9 — artigo em posição fixa (D2). Não é uma página própria: é a mesma
 * `ArtigoDetalhePage` da tela 8 com o slug reservado, `reservado` ligado só
 * para escolher a variante de 404 (§4).
 */
export const Route = createFileRoute('/como-funciona')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()

  const navegar = useCallback(
    ({ href, replace }: NavegarParaCanonica) => {
      void navigate({ to: href, replace } as unknown as Parameters<typeof navigate>[0])
    },
    [navigate],
  )

  return (
    <ArtigoDetalhePage
      artigoSlug={SLUG_COMO_FUNCIONA}
      caminhoAtual="/como-funciona"
      reservado
      navegar={navegar}
    />
  )
}
