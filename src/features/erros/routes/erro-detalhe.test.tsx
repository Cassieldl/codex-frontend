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
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
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

interface OpcoesRenderPagina {
  erroSlug: string
  caminhoAtual?: string
}

function renderPagina({ erroSlug, caminhoAtual = `/erros/${erroSlug}` }: OpcoesRenderPagina) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const navegar = vi.fn()

  const rootRoute = createRootRoute({ component: Outlet })
  const rotaErro = createRoute({
    getParentRoute: () => rootRoute,
    path: caminhoAtual,
    component: () => (
      <ErroDetalhePage erroSlug={erroSlug} caminhoAtual={caminhoAtual} navegar={navegar} />
    ),
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
    history: createMemoryHistory({ initialEntries: [caminhoAtual] }),
  })

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...utils, navegar }
}

describe('ErroDetalhePage — bloco de artigos relacionados (§5)', () => {
  it('sem artigos ligados (coleção vazia do contrato), a seção não aparece', async () => {
    server.use(handlerErroDetalhePadrao('e0117'))

    renderPagina({ erroSlug: 'e0117' })

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

    renderPagina({ erroSlug: erro.slug })

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

// F-4 (`arquitetura.md` §5.F) — `erro` nunca teve mecanismo de correção de
// slug. Estes testes travam que ele passou a ter, no mesmo padrão de
// `artigo-detalhe.test.tsx`.
describe('ErroDetalhePage — correção de URL canônica (F-4)', () => {
  it('não redireciona quando o caminho atual já é o canônico', async () => {
    server.use(handlerErroDetalhePadrao('e0117'))

    const { navegar } = renderPagina({ erroSlug: 'e0117' })

    await screen.findByRole('heading', { level: 1, name: 'E0117' })
    expect(navegar).not.toHaveBeenCalled()
  })

  it('redireciona para /erros/{slug} quando o endereço atual diverge do slug canônico', async () => {
    const erroComSlugNovo: ErroDetalhe = { ...erroBase, slug: 'e0117-slug-novo' }
    server.use(
      http.get(`${API_URL}/erros/e0117-slug-antigo`, () =>
        HttpResponse.json({ data: erroComSlugNovo, message: null }),
      ),
    )

    const { navegar } = renderPagina({
      erroSlug: 'e0117-slug-antigo',
      caminhoAtual: '/erros/e0117-slug-antigo',
    })

    await waitFor(() =>
      expect(navegar).toHaveBeenCalledWith({ href: '/erros/e0117-slug-novo', replace: true }),
    )
    // Enquanto redireciona, o conteúdo não aparece no endereço não-canônico.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })
})
