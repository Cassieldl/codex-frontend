import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LayoutResumoHome } from '../types/home'
import { BlocoLayoutHome } from './BlocoLayoutHome'

const layout: LayoutResumoHome = {
  vigente: { slug: '4-12', rotulo: '4.12' },
  prevista: { slug: '4-13', rotulo: '4.13' },
  descricao: 'Novo grupo de retenções e dois campos de intermediário descontinuados.',
  camposNovos: 6,
  camposDescontinuados: 2,
  normaOrigem: null,
  homologacaoDesde: null,
  liberadaNoInvoicyEm: null,
  obrigatoriaEm: null,
}

/**
 * Âncora de montagem, `RouterProvider` monta de forma assíncrona, e afirmar
 * `container` vazio logo depois de `render` passa mesmo com a seção
 * renderizando. Ausência só vale depois de esperar por isto.
 */
const ANCORA = 'rota montada'

function renderBloco(resumo: LayoutResumoHome | null) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaHome = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <>
        <p>{ANCORA}</p>
        <BlocoLayoutHome layout={resumo} />
      </>
    ),
  })
  const rotaLayout = createRoute({
    getParentRoute: () => rootRoute,
    path: '/layout',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaHome, rotaLayout])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('BlocoLayoutHome', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('não renderiza o card quando não há layout publicado', async () => {
    renderBloco(null)

    await screen.findByText(ANCORA)
    expect(screen.queryByRole('heading', { name: /Layout InvoiCy/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Ver / })).not.toBeInTheDocument()
  })

  it('mostra a vigente no título, a prevista e as mudanças, com o link para o que mudou', async () => {
    renderBloco(layout)

    expect(
      await screen.findByRole('heading', { name: 'Layout InvoiCy versão 4.12 vigente' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Versão 4.13 prevista')).toBeInTheDocument()
    expect(screen.getByText(/6 campos novos · 2 descontinuados/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver o que mudou' })).toHaveAttribute(
      'href',
      '/layout#novidades',
    )
  })

  it('com prazo no futuro, o título traz a data e o selo conta os dias', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 17, 10))
    renderBloco({ ...layout, obrigatoriaEm: '2026-12-01' })

    expect(
      await screen.findByRole('heading', {
        name: 'Layout InvoiCy versão 4.12 obrigatória em 01/12/2026',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Faltam 14 dias')).toBeInTheDocument()
  })

  it('com o prazo vencido, mantém a data no título e tira o selo', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 11, 5, 10))
    renderBloco({ ...layout, obrigatoriaEm: '2026-12-01' })

    await screen.findByRole('heading', {
      name: 'Layout InvoiCy versão 4.12 obrigatória em 01/12/2026',
    })
    expect(screen.queryByText(/^Falta/)).not.toBeInTheDocument()
  })

  it('mostra só o resumo da nota: os tópicos do que mudou ficam na página do layout', async () => {
    renderBloco({ ...layout, descricao: 'InvoiCy 3.3.0.0.\nGrupos novos: Condominio' })

    expect(await screen.findByText(/InvoiCy 3\.3\.0\.0\./)).toBeInTheDocument()
    expect(screen.queryByText(/Condominio/)).not.toBeInTheDocument()
  })

  it('cala as mudanças quando não há campo novo nem descontinuado', async () => {
    renderBloco({
      ...layout,
      descricao: 'Ajustes de redação nos significados.',
      camposNovos: 0,
      camposDescontinuados: 0,
    })

    await screen.findByRole('heading', { name: 'Layout InvoiCy versão 4.12 vigente' })
    expect(screen.queryByText(/campos? novos?/)).not.toBeInTheDocument()
    expect(screen.queryByText(/descontinuado/)).not.toBeInTheDocument()
  })

  it('usa singular quando há exatamente um campo de cada lado', async () => {
    renderBloco({ ...layout, camposNovos: 1, camposDescontinuados: 1 })

    expect(await screen.findByText(/1 campo novo · 1 descontinuado/)).toBeInTheDocument()
  })

  it('omite a prevista quando não há próxima versão anunciada', async () => {
    renderBloco({ ...layout, prevista: null })

    await screen.findByRole('heading', { name: 'Layout InvoiCy versão 4.12 vigente' })
    expect(screen.queryByText(/prevista/)).not.toBeInTheDocument()
  })
})
