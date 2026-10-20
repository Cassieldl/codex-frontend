import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { handlerLayoutIndiceSucesso } from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import { LayoutIndicePage } from './layout-index'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de LayoutIndiceDto, sem o tipo do cliente.
const indiceCompleto = {
  vigente: { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 58 },
  versoes: [
    { slug: '4-13', rotulo: '4.13', estado: 'Prevista', ordem: 3, totalCampos: 62 },
    { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 58 },
    { slug: '4-10', rotulo: '4.10', estado: 'Anterior', ordem: 1, totalCampos: 55 },
  ],
}

function renderPagina() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/layout',
    component: LayoutIndicePage,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/layout'] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('LayoutIndicePage', () => {
  it('lista as versões publicadas na ordem do backend, com link para o dicionário de cada uma', async () => {
    server.use(handlerLayoutIndiceSucesso(indiceCompleto))
    renderPagina()

    const links = await screen.findAllByRole('link', { name: /Ver o dicionário da versão/ })
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Ver o dicionário da versão 4.13',
      'Ver o dicionário da versão 4.12',
      'Ver o dicionário da versão 4.10',
    ])
    expect(links[0]).toHaveAttribute('href', '/layout/4-13')
  })

  it('o estado de cada versão aparece por extenso, nunca só pela forma da borda', async () => {
    server.use(handlerLayoutIndiceSucesso(indiceCompleto))
    renderPagina()

    expect(await screen.findByText('Prevista')).toBeInTheDocument()
    expect(screen.getByText('Vigente')).toBeInTheDocument()
    expect(screen.getByText('Anterior')).toBeInTheDocument()
  })

  it('mostra o estado vazio quando não há nenhuma versão publicada', async () => {
    server.use(handlerLayoutIndiceSucesso({ vigente: null, versoes: [] }))
    renderPagina()

    expect(
      await screen.findByText('O Layout InvoiCy ainda não tem nenhuma versão publicada.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('erro nunca é lido como vazio — mostra alerta com repetição, não o estado vazio', async () => {
    server.use(http.get(`${API_URL}/layout`, () => HttpResponse.json({}, { status: 500 })))
    renderPagina()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.queryByText('O Layout InvoiCy ainda não tem nenhuma versão publicada.'),
    ).not.toBeInTheDocument()
  })

  it('anuncia o carregamento enquanto a consulta não volta', async () => {
    server.use(
      http.get(`${API_URL}/layout`, async () => {
        await delay(80)
        return HttpResponse.json({ data: indiceCompleto, message: null })
      }),
    )
    renderPagina()

    expect(await screen.findByText('Carregando as versões do Layout InvoiCy…')).toBeInTheDocument()
    // E o carregamento some quando o conteúdo chega — nunca fica preso.
    expect(
      await screen.findByText('Versão do layout — escolha para ver o dicionário'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Carregando as versões do Layout InvoiCy…')).not.toBeInTheDocument()
  })

  it('afirma em texto fixo que o layout é vocabulário, não comportamento', async () => {
    server.use(handlerLayoutIndiceSucesso(indiceCompleto))
    renderPagina()

    expect(await screen.findByText('Vocabulário, não comportamento.')).toBeInTheDocument()
  })
})

describe('LayoutIndicePage: título da aba', () => {
  it('nomeia a aba "Layout InvoiCy | Codex"', async () => {
    server.use(handlerLayoutIndiceSucesso(indiceCompleto))
    renderPagina()

    await screen.findAllByRole('link', { name: /Ver o dicionário da versão/ })
    expect(document.title).toBe('Layout InvoiCy | Codex')
  })
})
