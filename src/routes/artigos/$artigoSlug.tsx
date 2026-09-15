import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { ArtigoDetalhePage } from '../../features/artigos/routes/artigo-detalhe'
import type { NavegarParaCanonica } from '../../features/artigos/routes/artigo-detalhe'

// Rota fina (§3) — toda a lógica mora em `features/artigos/routes/artigo-detalhe.tsx`,
// testável isoladamente sem depender da árvore de rotas gerada.
export const Route = createFileRoute('/artigos/$artigoSlug')({
  component: RouteComponent,
})

function RouteComponent() {
  const { artigoSlug } = Route.useParams()
  const navigate = Route.useNavigate()

  // `useCallback` mantém a identidade estável entre renders — o efeito de
  // redirecionamento canônico depende dela e entraria em laço com uma função
  // nova a cada render.
  const navegar = useCallback(
    ({ href, replace }: NavegarParaCanonica) => {
      void navigate({ to: href, replace } as unknown as Parameters<typeof navigate>[0])
    },
    [navigate],
  )

  return (
    <ArtigoDetalhePage
      artigoSlug={artigoSlug}
      caminhoAtual={`/artigos/${artigoSlug}`}
      navegar={navegar}
    />
  )
}
