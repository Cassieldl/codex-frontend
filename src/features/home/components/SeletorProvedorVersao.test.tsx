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
import { SeletorProvedorVersao } from './SeletorProvedorVersao'

const ipm: ProvedorHomeDto = {
  slug: 'ipm',
  nome: 'IPM Sistemas',
  versoes: [
    { slug: '2-04', rotulo: '2.04' },
    { slug: '2-03', rotulo: '2.03' },
    { slug: '1-00', rotulo: '1.00' },
  ],
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
    component: () => <SeletorProvedorVersao provedores={provedores} />,
  })
  const rotaVersao = createRoute({
    getParentRoute: () => rootRoute,
    path: '/provedores/$provedorSlug/$versaoSlug',
    component: () => <p>página da versão</p>,
  })
  const routeTree = rootRoute.addChildren([rotaHome, rotaVersao])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  render(<RouterProvider router={router} />)
  return router
}

async function abrirListbox(nomeDoCampo: string) {
  const usuario = userEvent.setup()
  await usuario.click(await screen.findByRole('combobox', { name: nomeDoCampo }))
  return screen.getByRole('listbox', { name: nomeDoCampo })
}

describe('SeletorProvedorVersao', () => {
  it('oferece exatamente as versões que o contrato trouxe — nenhuma a mais', async () => {
    renderSeletor([ipm])

    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('combobox', { name: 'Provedor' }))
    await usuario.click(screen.getByRole('option', { name: 'IPM Sistemas' }))

    const listbox = await abrirListbox('Versão')
    const rotulos = within(listbox)
      .getAllByRole('option')
      .map((opcao) => opcao.textContent)

    // Igualdade estrita de propósito: "contém pelo menos uma opção" deixaria
    // passar uma versão inventada pelo cliente. O widget só pode oferecer o que
    // o backend publicou.
    expect(rotulos).toEqual(['2.04', '2.03', '1.00'])
  })

  it('pré-escolhe a versão mais recente ao escolher o provedor', async () => {
    renderSeletor([ipm])

    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('combobox', { name: 'Provedor' }))
    await usuario.click(screen.getByRole('option', { name: 'IPM Sistemas' }))

    expect(screen.getByRole('combobox', { name: 'Versão' })).toHaveTextContent('2.04')
  })

  it('abre a versão escolhida, não a mais recente', async () => {
    const router = renderSeletor([ipm])

    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('combobox', { name: 'Provedor' }))
    await usuario.click(screen.getByRole('option', { name: 'IPM Sistemas' }))
    await usuario.click(screen.getByRole('combobox', { name: 'Versão' }))
    await usuario.click(screen.getByRole('option', { name: '1.00' }))
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/provedores/ipm/1-00'))
  })

  it('mantém "Abrir" desabilitado enquanto não há provedor escolhido', async () => {
    renderSeletor([ipm])

    expect(await screen.findByRole('button', { name: 'Abrir' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Versão' })).toBeDisabled()
  })

  it('provedor sem versão publicada diz isso e não deixa abrir nada', async () => {
    renderSeletor([semVersao])

    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('combobox', { name: 'Provedor' }))
    await usuario.click(screen.getByRole('option', { name: 'Prefeitura sem versão' }))

    const versao = screen.getByRole('combobox', { name: 'Versão' })
    expect(versao).toBeDisabled()
    expect(versao).toHaveTextContent('Sem versões publicadas')
    expect(screen.getByRole('button', { name: 'Abrir' })).toBeDisabled()
  })
})
