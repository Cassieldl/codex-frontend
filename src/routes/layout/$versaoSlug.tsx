import { createFileRoute } from '@tanstack/react-router'
import { LayoutVersaoPage } from '../../features/layout/routes/layout-versao'

// Rota fina (M2) — o dicionário denso vive em
// `features/layout/routes/layout-versao.tsx`.
export const Route = createFileRoute('/layout/$versaoSlug')({
  component: RouteComponent,
})

function RouteComponent() {
  const { versaoSlug } = Route.useParams()

  return <LayoutVersaoPage versaoSlug={versaoSlug} />
}
