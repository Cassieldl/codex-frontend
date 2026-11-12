import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BuscaDoCabecalho } from './BuscaDoCabecalho'

function renderComRouter() {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaPagina = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pagina',
    component: () => (
      <>
        <BuscaDoCabecalho />
        <label>
          Outro campo
          <input />
        </label>
      </>
    ),
  })
  const rotaBusca = createRoute({
    getParentRoute: () => rootRoute,
    path: '/busca',
    component: () => <p>Página de busca</p>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rotaPagina, rotaBusca]),
    history: createMemoryHistory({ initialEntries: ['/pagina'] }),
  })

  render(<RouterProvider router={router} />)

  return router
}

describe('BuscaDoCabecalho', () => {
  it('a tecla "/" foca o campo sem escrever a barra nele', async () => {
    renderComRouter()
    const campo = await screen.findByRole('searchbox', { name: 'Buscar no Codex' })

    await userEvent.keyboard('/')

    expect(campo).toHaveFocus()
    expect(campo).toHaveValue('')
  })

  it('a tecla "/" digitada em outro campo fica no campo, sem roubar o foco', async () => {
    renderComRouter()
    const outroCampo = await screen.findByRole('textbox', { name: 'Outro campo' })

    await userEvent.type(outroCampo, 'a/b')

    expect(outroCampo).toHaveFocus()
    expect(outroCampo).toHaveValue('a/b')
  })

  it('Enter abre a busca com o termo, sem os espaços das pontas', async () => {
    const router = renderComRouter()
    const campo = await screen.findByRole('searchbox', { name: 'Buscar no Codex' })

    await userEvent.type(campo, '  E0304 {Enter}')

    expect(await screen.findByText('Página de busca')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/busca')
    expect(router.state.location.search).toEqual({ q: 'E0304' })
  })

  it('Enter com o campo em branco não sai da página', async () => {
    const router = renderComRouter()
    const campo = await screen.findByRole('searchbox', { name: 'Buscar no Codex' })

    await userEvent.type(campo, '   {Enter}')

    expect(router.state.location.pathname).toBe('/pagina')
  })
})
