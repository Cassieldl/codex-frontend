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
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { handlerErroDetalhePadrao } from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import type { ErroDetalhe } from '../types/erro'
import { ErroDetalhePage } from './erro-detalhe'

const API_URL = import.meta.env.VITE_API_URL

const erroBase: ErroDetalhe = {
  slug: 'e0117-cnpj-tomador-invalido',
  codigo: 'E0117',
  origem: 'Prefeitura',
  titulo: 'CNPJ do tomador inválido',
  variantes: [],
  causaProvavel: null,
  solucaoSugerida: null,
  versoesAplicaveis: [],
  camposRelacionados: [],
  artigosRelacionados: [],
}

function renderPagina(erroSlug: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute({ component: Outlet })
  const rotaErro = createRoute({
    getParentRoute: () => rootRoute,
    path: '/erros/$erroSlug',
    component: () => <ErroDetalhePage erroSlug={erroSlug} />,
  })
  const rotaArtigo = createRoute({
    getParentRoute: () => rootRoute,
    path: '/artigos/$artigoSlug',
    component: () => null,
  })
  const rotaBusca = createRoute({
    getParentRoute: () => rootRoute,
    path: '/busca',
    validateSearch: (search: Record<string, unknown>) => search,
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaErro, rotaArtigo, rotaBusca])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [`/erros/${erroSlug}`] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('ErroDetalhePage — bloco de artigos relacionados (§5)', () => {
  it('sem artigos ligados (coleção vazia do contrato), a seção não aparece', async () => {
    server.use(handlerErroDetalhePadrao('e0117'))

    renderPagina('e0117')

    expect(await screen.findByRole('heading', { level: 1, name: 'E0117' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Artigos relacionados' })).not.toBeInTheDocument()
  })

  it('com artigos ligados, a seção lista os links depois dos campos relacionados', async () => {
    const erro: ErroDetalhe = {
      ...erroBase,
      camposRelacionados: [{ campoLayoutSlug: 'cnpj-tomador', nome: 'CNPJ do tomador' }],
      artigosRelacionados: [
        {
          rotulo: 'ARTIGO',
          slug: 'campo-ausente-nao-se-aplica',
          tipo: 'Conceito',
          titulo: 'Campo ausente quer dizer “não se aplica”',
          url: '/artigos/campo-ausente-nao-se-aplica',
        },
      ],
    }
    server.use(
      http.get(`${API_URL}/erros/${erro.slug}`, () =>
        HttpResponse.json({ data: erro, message: null }),
      ),
    )

    renderPagina(erro.slug)

    expect(await screen.findByRole('heading', { name: 'Artigos relacionados' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Campo ausente quer dizer “não se aplica”' }),
    ).toHaveAttribute('href', '/artigos/campo-ausente-nao-se-aplica')

    // Ordem de leitura: campos relacionados vêm antes dos artigos.
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((titulo) => titulo.textContent)
    expect(titulos.indexOf('Campos relacionados')).toBeLessThan(
      titulos.indexOf('Artigos relacionados'),
    )
  })
})
