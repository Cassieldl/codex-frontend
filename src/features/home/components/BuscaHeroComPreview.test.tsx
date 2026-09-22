import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../../test/mocks/server'
import type {
  GrupoResultado,
  ResultadoBusca,
  ResultadoItem,
} from '../../busca/types/resultadoBusca'
import { BuscaHeroComPreview } from './BuscaHeroComPreview'

const API_URL = import.meta.env.VITE_API_URL

function item(titulo: string, url: string): ResultadoItem {
  return {
    tipo: 'erro',
    rotulo: 'Erro',
    chave: titulo,
    titulo,
    url,
    provedorNome: 'IPM Sistemas',
    versaoRotulo: '2.04',
    versoes: null,
    descricaoCasamento: 'casou com o código',
    publicado: true,
    meta: null,
    pontuacao: 1,
    trechos: [],
  }
}

function grupoDeErros(itens: ResultadoItem[]): GrupoResultado {
  return { tipo: 'erro', rotulo: 'Erros', total: itens.length, pontuacao: 1, itens }
}

function resultado(
  grupos: GrupoResultado[],
  overrides: Partial<ResultadoBusca> = {},
): ResultadoBusca {
  return {
    termo: 'e01',
    termoUsado: 'e01',
    correcao: null,
    qualidade: 'exata',
    totalGeral: grupos.reduce((soma, grupo) => soma + grupo.total, 0),
    grupos,
    foraDoFiltro: null,
    filtroProvedor: null,
    ...overrides,
  }
}

function renderHero(aoSubmeter = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute({ component: Outlet })
  const rotaHome = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <BuscaHeroComPreview aoSubmeter={aoSubmeter} />,
  })
  const rotaErro = createRoute({
    getParentRoute: () => rootRoute,
    path: '/erros/$erroSlug',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaHome, rotaErro])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { aoSubmeter }
}

describe('BuscaHeroComPreview', () => {
  it('não rouba o foco ao carregar a Home', async () => {
    renderHero()

    const campo = await screen.findByRole('searchbox')
    expect(campo).not.toHaveFocus()
    expect(campo).not.toHaveAttribute('autofocus')
  })

  it('pré-visualiza até três itens por grupo, com link para a URL do item', async () => {
    server.use(
      http.get(`${API_URL}/busca`, () =>
        HttpResponse.json({
          data: resultado([
            grupoDeErros([
              item('Primeiro erro', '/erros/e0421'),
              item('Segundo erro', '/erros/e0117'),
              item('Terceiro erro', '/erros/e2043'),
              item('Quarto erro', '/erros/e0009'),
            ]),
          ]),
          message: null,
        }),
      ),
    )

    const usuario = userEvent.setup()
    renderHero()

    await usuario.type(await screen.findByRole('searchbox'), 'e01')

    expect(await screen.findByRole('link', { name: /Primeiro erro/ })).toHaveAttribute(
      'href',
      '/erros/e0421',
    )
    expect(screen.getByRole('link', { name: /Terceiro erro/ })).toBeInTheDocument()
    expect(screen.queryByText('Quarto erro')).not.toBeInTheDocument()
  })

  it('erro de busca não é lido como "nenhum resultado" — sem contagem nenhuma', async () => {
    server.use(http.get(`${API_URL}/busca`, () => new HttpResponse(null, { status: 500 })))

    const usuario = userEvent.setup()
    renderHero()

    await usuario.type(await screen.findByRole('searchbox'), 'e01')

    const aviso = await screen.findByText('Não foi possível buscar agora.')
    expect(aviso).toBeInTheDocument()
    expect(screen.queryByText(/0 resultado/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Não há conteúdo publicado/)).not.toBeInTheDocument()
  })

  it('busca sem resultado diz que o acervo não cobre o termo — e isso não é erro', async () => {
    server.use(
      http.get(`${API_URL}/busca`, () =>
        HttpResponse.json({
          data: resultado([], { qualidade: 'vazia', termoUsado: 'xyz' }),
          message: null,
        }),
      ),
    )

    const usuario = userEvent.setup()
    renderHero()

    await usuario.type(await screen.findByRole('searchbox'), 'xyz')

    expect(await screen.findByText(/Não há conteúdo publicado para/)).toBeInTheDocument()
    expect(screen.queryByText('Não foi possível buscar agora.')).not.toBeInTheDocument()
  })

  it('Enter sem item escolhido leva o termo para a tela de busca', async () => {
    server.use(
      http.get(`${API_URL}/busca`, () => HttpResponse.json({ data: resultado([]), message: null })),
    )

    const usuario = userEvent.setup()
    const { aoSubmeter } = renderHero()

    await usuario.type(await screen.findByRole('searchbox'), 'e0117{Enter}')

    await waitFor(() => expect(aoSubmeter).toHaveBeenCalledWith('e0117'))
  })

  it('não submete termo curto demais para a busca', async () => {
    const usuario = userEvent.setup()
    const { aoSubmeter } = renderHero()

    await usuario.type(await screen.findByRole('searchbox'), 'e{Enter}')

    expect(aoSubmeter).not.toHaveBeenCalled()
  })

  it('item com URL que não é caminho interno aparece sem link', async () => {
    server.use(
      http.get(`${API_URL}/busca`, () =>
        HttpResponse.json({
          data: resultado([grupoDeErros([item('Erro sequestrado', '//evil.example')])]),
          message: null,
        }),
      ),
    )

    const usuario = userEvent.setup()
    renderHero()

    await usuario.type(await screen.findByRole('searchbox'), 'e01')

    expect(await screen.findByText('Erro sequestrado')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Erro sequestrado/ })).not.toBeInTheDocument()
  })
})
