import { createFileRoute } from '@tanstack/react-router'
import { ProvedorAbaRota } from '../../../features/provedores/routes/provedor-aba-rota'

export const Route = createFileRoute('/provedores/$provedorSlug/natureza-da-operacao')({
  component: () => <ProvedorAbaRota aba="natureza" />,
})
