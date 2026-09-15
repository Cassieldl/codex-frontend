import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CabecalhoPublico } from './CabecalhoPublico'

// `<Link>` do TanStack Router precisa de um `RouterProvider` real — mesmo
// padrão de `RodapeContextual.test.tsx`. As rotas de destino (`/artigos`,
// `/como-funciona`) ainda não existem nesta unidade (nascem em FRONT-B):
// a árvore de teste só precisa da rota que hospeda o componente.
function renderComRouter() {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pagina',
    component: () => <CabecalhoPublico />,
  })
  const routeTree = rootRoute.addChildren([rota])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('CabecalhoPublico — navegação (M31/§4.1)', () => {
  it('mostra "Artigos" apontando para /artigos com pagina=1', async () => {
    renderComRouter()

    expect(await screen.findByRole('link', { name: 'Artigos' })).toHaveAttribute(
      'href',
      '/artigos?pagina=1',
    )
  })

  it('mostra "Como funciona" apontando para /como-funciona, sempre presente', async () => {
    renderComRouter()

    expect(await screen.findByRole('link', { name: 'Como funciona' })).toHaveAttribute(
      'href',
      '/como-funciona',
    )
  })

  it('mantém "Provedores" existente intacto', async () => {
    renderComRouter()

    expect(await screen.findByRole('link', { name: 'Provedores' })).toHaveAttribute(
      'href',
      '/provedores?pagina=1',
    )
  })
})
