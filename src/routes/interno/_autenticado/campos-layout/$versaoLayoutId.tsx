import { createFileRoute } from '@tanstack/react-router'
import { IdVersaoLayoutPage } from '../../../../features/interno/camposLayout/pages/idVersaoLayout'

export const Route = createFileRoute('/interno/_autenticado/campos-layout/$versaoLayoutId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { versaoLayoutId } = Route.useParams()
  return <IdVersaoLayoutPage versaoLayoutId={Number(versaoLayoutId)} />
}
