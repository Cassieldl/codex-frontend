import { createFileRoute } from '@tanstack/react-router'
import { IdProvedorPage } from '../../../../../features/interno/provedores/pages/idProvedor'

export const Route = createFileRoute('/interno/_autenticado/provedores/$provedorId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { provedorId } = Route.useParams()
  return <IdProvedorPage provedorId={Number(provedorId)} />
}
