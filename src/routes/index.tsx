import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '../features/home/routes/home'

/**
 * `/` — Home (tela 1). Arquivo de rota fino, como o resto do portal: sem
 * `validateSearch`, porque a Home não tem estado de URL nenhum (sem filtro,
 * sem paginação). Toda a tela vive em `features/home/routes/home.tsx`.
 */
export const Route = createFileRoute('/')({
  component: RotaHome,
})

function RotaHome() {
  const navigate = Route.useNavigate()

  return <HomePage navegarParaBusca={(termo) => navigate({ to: '/busca', search: { q: termo } })} />
}
