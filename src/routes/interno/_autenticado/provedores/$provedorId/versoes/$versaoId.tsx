import { createFileRoute } from '@tanstack/react-router'
import { IdVersaoPage } from '../../../../../../features/interno/provedores/pages/idVersao'
import { versaoSearchSchema } from '../../../../../../features/interno/provedores/types/abaDaVersao'

export const Route = createFileRoute(
  '/interno/_autenticado/provedores/$provedorId/versoes/$versaoId',
)({
  validateSearch: versaoSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { provedorId, versaoId } = Route.useParams()
  const { aba } = Route.useSearch()

  return <IdVersaoPage provedorId={Number(provedorId)} versaoId={Number(versaoId)} aba={aba} />
}
