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
import type { ArtigoListaItem } from '../types/artigo'
import { CardArtigo } from './CardArtigo'

const artigo: ArtigoListaItem = {
  slug: 'identificar-a-versao-pelo-retorno',
  tipo: 'Procedimento',
  titulo: 'Identificar a versão pelo retorno',
  resumo: 'Como descobrir qual versão o município usa a partir do XML de retorno.',
  verificadoEm: '2026-08-14',
}

function renderCard(item: ArtigoListaItem, mostrarTipo?: boolean) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaLista = createRoute({
    getParentRoute: () => rootRoute,
    path: '/artigos',
    component: () => <CardArtigo artigo={item} mostrarTipo={mostrarTipo} />,
  })
  const rotaArtigo = createRoute({
    getParentRoute: () => rootRoute,
    path: '/artigos/$artigoSlug',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaLista, rotaArtigo])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/artigos'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('CardArtigo', () => {
  it('título é um <h2> com link para a página do artigo', async () => {
    renderCard(artigo)

    const titulo = await screen.findByRole('heading', { level: 2 })
    expect(titulo).toHaveTextContent('Identificar a versão pelo retorno')
    expect(screen.getByRole('link', { name: 'Identificar a versão pelo retorno' })).toHaveAttribute(
      'href',
      '/artigos/identificar-a-versao-pelo-retorno',
    )
  })

  it('mostra o selo com a data do contrato — sem deslocar o dia por fuso', async () => {
    renderCard(artigo)

    expect(await screen.findByText('14 de agosto de 2026')).toBeInTheDocument()
  })

  it('sem verificadoEm não inventa data nem mostra "—"', async () => {
    renderCard({ ...artigo, verificadoEm: null })

    await screen.findByRole('heading', { level: 2 })
    expect(screen.queryByText(/Verificado em/)).not.toBeInTheDocument()
  })

  it('sem resumo, renderiza só o título — `null` é valor válido do contrato', async () => {
    renderCard({ ...artigo, resumo: null })

    await screen.findByRole('heading', { level: 2 })
    expect(
      screen.queryByText('Como descobrir qual versão o município usa a partir do XML de retorno.'),
    ).not.toBeInTheDocument()
  })

  it('resumo que é só a citação da fonte não aparece', async () => {
    renderCard({ ...artigo, resumo: 'Fonte: Webhook - Configurações (12/08/2026).' })

    await screen.findByRole('heading', { level: 2 })
    expect(screen.queryByText(/^Fonte:/)).not.toBeInTheDocument()
  })

  it('esconde o tipo quando a lista já está filtrada por ele', async () => {
    renderCard(artigo, false)

    await screen.findByRole('heading', { level: 2 })
    expect(screen.queryByText('Procedimento')).not.toBeInTheDocument()
  })
})
