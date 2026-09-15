import { createFileRoute } from '@tanstack/react-router'
import { IdVersaoPage } from '../../../../../../features/interno/provedores/pages/idVersao'

export const Route = createFileRoute(
  '/interno/_autenticado/provedores/$provedorId/versoes/$versaoId',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { provedorId, versaoId } = Route.useParams()
  return <IdVersaoPage provedorId={Number(provedorId)} versaoId={Number(versaoId)} />
}
