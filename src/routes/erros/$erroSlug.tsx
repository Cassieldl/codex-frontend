import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { ErroDetalhePage } from '../../features/erros/routes/erro-detalhe'
import type { NavegacaoCanonica } from '../../utils/corrigirUrlCanonica'

// Rota fina (§7.2) — toda a lógica mora em `features/erros/routes/erro-detalhe.tsx`,
// testável isoladamente sem depender da árvore de rotas gerada.
export const Route = createFileRoute('/erros/$erroSlug')({
  component: RouteComponent,
})

function RouteComponent() {
  const { erroSlug } = Route.useParams()
  const navigate = Route.useNavigate()

  // `useCallback` mantém a identidade estável entre renders — o efeito de
  // redirecionamento canônico depende dela e entraria em laço com uma função
  // nova a cada render (mesmo padrão de `routes/artigos/$artigoSlug.tsx`).
  const navegar = useCallback(
    ({ href, replace }: NavegacaoCanonica) => {
      void navigate({ to: href, replace } as unknown as Parameters<typeof navigate>[0])
    },
    [navigate],
  )

  return (
    <ErroDetalhePage erroSlug={erroSlug} caminhoAtual={`/erros/${erroSlug}`} navegar={navegar} />
  )
}
