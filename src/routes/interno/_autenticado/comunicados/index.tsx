import { createFileRoute } from '@tanstack/react-router'
import { ComunicadosPage } from '../../../../features/interno/comunicados/pages/comunicados'

export const Route = createFileRoute('/interno/_autenticado/comunicados/')({
  component: ComunicadosPage,
})
