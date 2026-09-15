import { createFileRoute } from '@tanstack/react-router'
import { ProvedoresPage } from '../../../../features/interno/provedores/pages/provedores'

export const Route = createFileRoute('/interno/_autenticado/provedores/')({
  component: ProvedoresPage,
})
