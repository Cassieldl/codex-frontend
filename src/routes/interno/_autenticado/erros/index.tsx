import { createFileRoute } from '@tanstack/react-router'
import { ErrosPage } from '../../../../features/interno/erros/pages/erros'

export const Route = createFileRoute('/interno/_autenticado/erros/')({
  component: ErrosPage,
})
