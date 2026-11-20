import { createFileRoute } from '@tanstack/react-router'
import { LayoutCampoResolucaoPage } from '../../../features/layout/routes/layout-campo-resolucao'

// Rota fina (M2) - a resolução da URL canônica do campo (A3) vive em
// `features/layout/routes/layout-campo-resolucao.tsx`. O segmento estático
// `campos` tem precedência sobre `/layout/$versaoSlug`.
export const Route = createFileRoute('/layout/campos/$campoSlug')({
  component: RouteComponent,
})

function RouteComponent() {
  const { campoSlug } = Route.useParams()
  const navigate = Route.useNavigate()

  return (
    <LayoutCampoResolucaoPage
      campoSlug={campoSlug}
      navegar={(opcoes) => {
        void navigate(opcoes)
      }}
    />
  )
}
