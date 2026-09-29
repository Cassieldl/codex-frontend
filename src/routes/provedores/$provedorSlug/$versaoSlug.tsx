import { createFileRoute } from '@tanstack/react-router'
import { VersaoProvedorPage } from '../../../features/provedores/routes/versao-provedor'

export const Route = createFileRoute('/provedores/$provedorSlug/$versaoSlug')({
  component: VersaoProvedorRoute,
})

// Rota fina — toda a lógica mora em `features/provedores/routes/versao-provedor.tsx`,
// testável isoladamente sem depender da árvore de rotas gerada (mesmo padrão
// de `route.tsx` e de `routes/artigos/$artigoSlug.tsx`).
function VersaoProvedorRoute() {
  const { provedorSlug, versaoSlug } = Route.useParams()

  return <VersaoProvedorPage provedorSlug={provedorSlug} versaoSlug={versaoSlug} />
}
