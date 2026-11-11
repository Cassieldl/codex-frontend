import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ProvedorHomeDto } from '../types/home'
import { SeletorProvedor } from './SeletorProvedor'

const ipm: ProvedorHomeDto = {
  slug: 'ipm',
  nome: 'IPM Sistemas',
  versoes: [{ slug: '2-04', rotulo: '2.04' }],
  verificadoEm: '2026-08-12',
  temComunicado: false,
}

const semVersao: ProvedorHomeDto = {
  slug: 'prefeitura-sem-versao',
  nome: 'Prefeitura sem versão',
  versoes: [],
  verificadoEm: null,
  temComunicado: false,
}

function renderSeletor(provedores: ProvedorHomeDto[]) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaHome = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <SeletorProvedor provedores={provedores} />,
  })
  const rotaProvedor = createRoute({
    getParentRoute: () => rootRoute,
    path: '/provedores/$provedorSlug',
    component: () => <p>página do provedor</p>,
  })
  const routeTree = rootRoute.addChildren([rotaHome, rotaProvedor])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  render(<RouterProvider router={router} />)
  return router
}

describe('SeletorProvedor', () => {
  it('oferece exatamente os provedores que o contrato trouxe, sem escolha de versão', async () => {
    renderSeletor([ipm, semVersao])

    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('combobox', { name: 'Provedor' }))
    const rotulos = within(screen.getByRole('listbox', { name: 'Provedor' }))
      .getAllByRole('option')
      .map((opcao) => opcao.textContent)

    expect(rotulos).toEqual(['IPM Sistemas', 'Prefeitura sem versão'])
    expect(screen.queryByRole('combobox', { name: 'Versão' })).not.toBeInTheDocument()
  })

  it('abre a página do provedor escolhido, sem versão no endereço', async () => {
    const router = renderSeletor([ipm])

    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('combobox', { name: 'Provedor' }))
    await usuario.click(screen.getByRole('option', { name: 'IPM Sistemas' }))
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/provedores/ipm'))
  })

  it('mantém "Abrir" desabilitado enquanto não há provedor escolhido', async () => {
    renderSeletor([ipm])

    expect(await screen.findByRole('button', { name: 'Abrir' })).toBeDisabled()
  })
})
