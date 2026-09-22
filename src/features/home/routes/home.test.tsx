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
import { describe, expect, it, vi } from 'vitest'
import { handlerHomeErro, handlerHomeSucesso } from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import type { HomeDto } from '../types/home'
import { HomePage } from './home'

const API_URL = import.meta.env.VITE_API_URL

const homeCompleta: Partial<HomeDto> = {
  comunicados: [
    {
      titulo: 'transmissão indisponível em Produção',
      corpo: 'Serviço fora do ar.',
      severidade: 'Critico',
      abrangencia: 'Provedor',
      expiraEm: '2026-08-19T09:00:00',
      provedorNome: 'Nacional/ADN',
      url: '/provedores/nacional-adn',
    },
    {
      titulo: 'Certificado expira em 15 dias',
      corpo: 'Renove antes do vencimento.',
      severidade: 'Alerta',
      abrangencia: 'Provedor',
      expiraEm: '2026-09-01T12:00:00',
      provedorNome: 'IPM Sistemas',
      url: '/provedores/ipm',
    },
  ],
  provedoresPorCategoria: [
    {
      categoria: 'Proprio',
      total: 1,
      provedores: [
        {
          slug: 'ipm',
          nome: 'IPM Sistemas',
          versoes: [{ slug: '2-04', rotulo: '2.04' }],
          verificadoEm: '2026-08-12',
          temComunicado: true,
        },
      ],
    },
  ],
  layout: {
    vigente: { slug: '4-12', rotulo: '4.12' },
    prevista: null,
    descricao: 'Novo grupo de retenções.',
    camposNovos: 6,
    camposDescontinuados: 2,
  },
  artigosRecentes: [
    {
      slug: 'identificar-a-versao-pelo-retorno',
      tipo: 'Procedimento',
      titulo: 'Identificar a versão pelo retorno',
      resumo: 'Como descobrir qual versão o município usa.',
      verificadoEm: '2026-08-14',
    },
  ],
}

function renderHome(navegarParaBusca = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute({ component: Outlet })
  const rotaHome = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <HomePage navegarParaBusca={navegarParaBusca} />,
  })
  const rotaProvedor = createRoute({
    getParentRoute: () => rootRoute,
    path: '/provedores/$provedorSlug',
    component: () => null,
  })
  const rotaVersao = createRoute({
    getParentRoute: () => rootRoute,
    path: '/provedores/$provedorSlug/$versaoSlug',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaHome, rotaProvedor, rotaVersao])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { navegarParaBusca }
}

describe('HomePage', () => {
  it('mostra esqueleto por seção enquanto o agregador não responde', async () => {
    server.use(
      http.get(`${API_URL}/home`, async () => {
        await delay('infinite')
        return HttpResponse.json({ data: homeCompleta, message: null })
      }),
    )

    renderHome()

    expect(await screen.findByText('Carregando a página inicial…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Provedores', level: 2 })).not.toBeInTheDocument()
  })

  it('mostra erro com opção de tentar de novo quando P9 falha', async () => {
    server.use(handlerHomeErro(500))

    renderHome()

    expect(await screen.findByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Provedores', level: 2 })).not.toBeInTheDocument()
  })

  it('mantém a busca disponível mesmo com o agregador fora do ar', async () => {
    server.use(handlerHomeErro(500))

    renderHome()

    await screen.findByRole('button', { name: 'Tentar novamente' })
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('monta as quatro seções com o conteúdo do agregador', async () => {
    server.use(handlerHomeSucesso(homeCompleta))

    renderHome()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nacional/ADN: transmissão indisponível em Produção',
    )
    expect(screen.getByRole('heading', { name: 'Provedores', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'IPM Sistemas' })).toHaveAttribute(
      'href',
      '/provedores/ipm',
    )
    expect(screen.getByRole('heading', { name: 'Layout InvoiCy', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Artigos', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Comunicados ativos')).toBeInTheDocument()
  })

  it('acervo sem provedor nenhum mostra estado vazio, nunca uma lista muda', async () => {
    server.use(handlerHomeSucesso({ provedoresPorCategoria: [] }))

    renderHome()

    expect(await screen.findByText('Nenhum provedor publicado ainda.')).toBeInTheDocument()
    // Sem provedor não há o que escolher — o widget de atalho não aparece.
    expect(screen.queryByRole('combobox', { name: 'Provedor' })).not.toBeInTheDocument()
  })

  it('layout ausente e artigos vazios não deixam buraco nem mensagem de falha', async () => {
    server.use(handlerHomeSucesso({ ...homeCompleta, layout: null, artigosRecentes: [] }))

    renderHome()

    expect(await screen.findByRole('heading', { name: 'Artigos', level: 2 })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Layout InvoiCy', level: 2 }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver o índice completo' })).toBeInTheDocument()
  })
})
