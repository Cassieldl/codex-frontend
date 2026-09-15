import { createFileRoute } from '@tanstack/react-router'
import { ErroDetalhePage } from '../../features/erros/routes/erro-detalhe'

// Rota fina (§7.2) — toda a lógica mora em `features/erros/routes/erro-detalhe.tsx`,
// testável isoladamente sem depender da árvore de rotas gerada.
export const Route = createFileRoute('/erros/$erroSlug')({
  component: RouteComponent,
})

function RouteComponent() {
  const { erroSlug } = Route.useParams()
  return <ErroDetalhePage erroSlug={erroSlug} />
}
