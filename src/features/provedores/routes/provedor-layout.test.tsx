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
import { server } from '../../../test/mocks/server'
import type { ProvedorDetalhe } from '../types/provedor'
import { ProvedorLayoutPage } from './provedor-layout'

const API_URL = import.meta.env.VITE_API_URL

const provedorFake: ProvedorDetalhe = {
  slug: 'prefeitura-exemplo',
  nome: 'Prefeitura de Exemplo',
  categoria: 'Nacional',
  identificadorInvoicy: 'EXEMPLO',
  avisos: [],
  versoes: [
    {
      slug: 'v1',
      rotulo: 'Versão 1',
      verificadoEm: '2026-07-01T00:00:00Z',
      url: '/provedores/prefeitura-exemplo/v1',
    },
  ],
}

interface OpcoesRenderPagina {
  provedorSlug: string
  versaoSlugAtual?: string
  caminhoAtual: string
}

function renderPagina({ provedorSlug, versaoSlugAtual, caminhoAtual }: OpcoesRenderPagina) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const navegar = vi.fn()

  // `<Link>`/`<Outlet>` exigem `RouterProvider` real — a árvore de teste só
  // precisa da rota que hospeda o componente (mesmo padrão de
  // `CabecalhoPublico.test.tsx`: os destinos dos `<Link>` não precisam estar
  // registrados para o `href` resolver).
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaLayout = createRoute({
    getParentRoute: () => rootRoute,
    path: caminhoAtual,
    component: () => (
      <ProvedorLayoutPage
        provedorSlug={provedorSlug}
        versaoSlugAtual={versaoSlugAtual}
        caminhoAtual={caminhoAtual}
        navegar={navegar}
      />
    ),
  })
  const routeTree = rootRoute.addChildren([rotaLayout])
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

function handlerProvedor(slugRequisitado: string, provedor: ProvedorDetalhe) {
  return http.get(`${API_URL}/provedores/${slugRequisitado}`, () =>
    HttpResponse.json({ data: provedor, message: null }),
  )
}

describe('ProvedorLayoutPage — correção de URL canônica (PQ-01/F2)', () => {
  it('não redireciona quando o caminho atual já é o canônico', async () => {
    server.use(handlerProvedor('prefeitura-exemplo', provedorFake))

    const { navegar } = renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    await screen.findByRole('heading', { level: 1, name: 'Prefeitura de Exemplo' })
    expect(navegar).not.toHaveBeenCalled()
  })

  it('redireciona para o slug novo quando o payload devolve um canônico divergente, sem versão', async () => {
    const provedorComSlugNovo: ProvedorDetalhe = { ...provedorFake, slug: 'slug-novo' }
    server.use(handlerProvedor('slug-antigo', provedorComSlugNovo))

    const { navegar } = renderPagina({
      provedorSlug: 'slug-antigo',
      caminhoAtual: '/provedores/slug-antigo',
    })

    await waitFor(() =>
      expect(navegar).toHaveBeenCalledWith({ href: '/provedores/slug-novo', replace: true }),
    )
    // Enquanto redireciona, o conteúdo não aparece no endereço não-canônico
    // (nunca um flash do slug antigo na aba/breadcrumb).
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('preserva o segmento de versão ao corrigir o slug do provedor', async () => {
    const provedorComSlugNovo: ProvedorDetalhe = { ...provedorFake, slug: 'slug-novo' }
    server.use(handlerProvedor('slug-antigo', provedorComSlugNovo))

    const { navegar } = renderPagina({
      provedorSlug: 'slug-antigo',
      versaoSlugAtual: 'v1',
      caminhoAtual: '/provedores/slug-antigo/v1',
    })

    await waitFor(() =>
      expect(navegar).toHaveBeenCalledWith({ href: '/provedores/slug-novo/v1', replace: true }),
    )
  })

  // Mutação-alvo (`analise-frontend.md` §2.9): trocar `replace: true` por
  // navegação normal empilharia histórico — "voltar" no navegador levaria de
  // volta ao slug morto. A asserção acima já cobre o valor exato de
  // `replace: true`; este teste reforça que `navegar` nunca é chamado com
  // outro valor além de `true`.
  it('o redirecionamento é sempre replace:true, nunca uma navegação que empilha histórico', async () => {
    const provedorComSlugNovo: ProvedorDetalhe = { ...provedorFake, slug: 'slug-novo' }
    server.use(handlerProvedor('slug-antigo', provedorComSlugNovo))

    const { navegar } = renderPagina({
      provedorSlug: 'slug-antigo',
      caminhoAtual: '/provedores/slug-antigo',
    })

    await waitFor(() => expect(navegar).toHaveBeenCalled())
    expect(navegar.mock.calls[0]![0]).toEqual({ href: '/provedores/slug-novo', replace: true })
  })
})
