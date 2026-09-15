import { createFileRoute } from '@tanstack/react-router'
import { InicioPage } from '../../../features/interno/pages/inicio'

export const Route = createFileRoute('/interno/_autenticado/')({
  component: InicioPage,
})
