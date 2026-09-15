import { createFileRoute } from '@tanstack/react-router'
import { CamposLayoutPage } from '../../../../features/interno/camposLayout/pages/camposLayout'

export const Route = createFileRoute('/interno/_autenticado/campos-layout/')({
  component: CamposLayoutPage,
})
