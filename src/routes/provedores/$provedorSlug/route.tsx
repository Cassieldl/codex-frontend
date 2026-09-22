import { createFileRoute, useLocation } from '@tanstack/react-router'
import { useCallback } from 'react'
import { ProvedorLayoutPage } from '../../../features/provedores/routes/provedor-layout'
import type { NavegacaoCanonica } from '../../../utils/corrigirUrlCanonica'

export const Route = createFileRoute('/provedores/$provedorSlug')({
  component: RouteComponent,
})

/**
 * Segmento após `/provedores/{provedorSlug}/` no caminho, se houver — usado
 * só para marcar a aba ativa em `AbasNavegaveis` e escolher o contexto do
 * rodapé/canônico. Nunca usado para decidir o que buscar: cada sub-rota já
 * busca os próprios dados (P4 tem hook e queryKey próprios).
 */
function extrairVersaoSlugAtual(pathname: string): string | undefined {
  const segmentos = pathname.split('/').filter(Boolean)
  return segmentos[2]
}

// Rota fina — toda a lógica mora em `features/provedores/routes/provedor-layout.tsx`,
// testável isoladamente sem depender da árvore de rotas gerada (mesmo padrão
// de `routes/artigos/$artigoSlug.tsx` e `routes/erros/$erroSlug.tsx`).
function RouteComponent() {
  const { provedorSlug } = Route.useParams()
  const location = useLocation()
  const versaoSlugAtual = extrairVersaoSlugAtual(location.pathname)
  const navigate = Route.useNavigate()

  const navegar = useCallback(
    ({ href, replace }: NavegacaoCanonica) => {
      void navigate({ to: href, replace } as unknown as Parameters<typeof navigate>[0])
    },
    [navigate],
  )

  return (
    <ProvedorLayoutPage
      provedorSlug={provedorSlug}
      versaoSlugAtual={versaoSlugAtual}
      caminhoAtual={location.pathname}
      navegar={navegar}
    />
  )
}
