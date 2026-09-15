import { createFileRoute } from '@tanstack/react-router'
import { ArtigosPage } from '../../../../features/interno/artigos/pages/artigos'

export const Route = createFileRoute('/interno/_autenticado/artigos/')({
  component: ArtigosPage,
})
