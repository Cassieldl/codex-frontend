import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EstadoDaSessao } from '../../auth/keycloak'
import { server } from '../../test/mocks/server'

const verificarSessaoMock = vi.fn<() => Promise<EstadoDaSessao>>()

vi.mock('../../auth/keycloak', () => ({
  verificarSessao: verificarSessaoMock,
  encerrarSessaoLocal: vi.fn(),
  keycloak: { tokenParsed: undefined, logout: vi.fn() },
}))

const { Route, useNoIndex } = await import('./_autenticado')
const { LoginIndisponivelErro } =
  await import('../../features/interno/components/loginIndisponivelErro')
const { navegacaoDoNavegador } = await import('../../auth/sessaoExpirada')

const API_URL = import.meta.env.VITE_API_URL

const ESPERA_DO_LAYOUT_NA_SUITE = 10_000

type ContextoBeforeLoad = Parameters<NonNullable<typeof Route.options.beforeLoad>>[0]

function criarContexto(href: string): ContextoBeforeLoad {
  return { location: { href } } as unknown as ContextoBeforeLoad
}

function chamarBeforeLoad(href: string): unknown {
  const beforeLoad = Route.options.beforeLoad
  if (!beforeLoad) throw new Error('beforeLoad não definido na rota _autenticado')
  return beforeLoad(criarContexto(href))
}

/** Monta as opções reais da rota (guard, pendente, erro e layout) num router de teste. */
function renderizarAreaInterna(caminho: string) {
  const rotaRaiz = createRootRoute()
  const rotaAutenticada = createRoute({
    getParentRoute: () => rotaRaiz,
    id: 'autenticado',
    beforeLoad: ({ location }) => chamarBeforeLoad(location.href),
    pendingMs: Route.options.pendingMs,
    pendingComponent: Route.options.pendingComponent,
    errorComponent: Route.options.errorComponent,
    component: Route.options.component,
  })
  const rotaDaTela = createRoute({
    getParentRoute: () => rotaAutenticada,
    path: caminho,
    component: () => <p>Conteúdo da tela</p>,
  })

  const router = createRouter({
    routeTree: rotaRaiz.addChildren([rotaAutenticada.addChildren([rotaDaTela])]),
    history: createMemoryHistory({ initialEntries: [caminho] }),
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  verificarSessaoMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('guard /interno/_autenticado', () => {
  it('sem sessão, redireciona para /interno/entrar preservando ?destino=', async () => {
    verificarSessaoMock.mockResolvedValue('anonimo')

    let capturado: unknown
    try {
      await chamarBeforeLoad('/interno/provedores/42')
    } catch (erro) {
      capturado = erro
    }

    expect(capturado).toBeInstanceOf(Response)
    const redirecionamento = capturado as Response & {
      options: { to: string; search: { destino: string } }
    }
    expect(redirecionamento.options.to).toBe('/interno/entrar')
    expect(redirecionamento.options.search).toEqual({ destino: '/interno/provedores/42' })
  })

  it('com sessão, deixa passar (não lança redirect)', async () => {
    verificarSessaoMock.mockResolvedValue('autenticado')

    await expect(chamarBeforeLoad('/interno')).resolves.toBeUndefined()
  })

  it('com o Keycloak fora do ar, não manda ao login: o redirect cairia na página de erro do navegador', async () => {
    verificarSessaoMock.mockResolvedValue('indisponivel')

    await expect(chamarBeforeLoad('/interno')).rejects.toBeInstanceOf(LoginIndisponivelErro)
  })
})

describe('telas do guard', () => {
  it('enquanto o check-sso não responde, mostra que está verificando a sessão', async () => {
    verificarSessaoMock.mockReturnValue(new Promise<EstadoDaSessao>(() => {}))

    renderizarAreaInterna('/interno/artigos')

    expect(await screen.findByRole('status')).toHaveTextContent('Verificando sua sessão')
    expect(screen.queryByText('Conteúdo da tela')).not.toBeInTheDocument()
  })

  it('com o login indisponível, mostra tela própria e tentar de novo recarrega a página', async () => {
    verificarSessaoMock.mockResolvedValue('indisponivel')
    const recarregar = vi.spyOn(navegacaoDoNavegador, 'recarregar').mockImplementation(() => {})

    renderizarAreaInterna('/interno/artigos')

    expect(
      await screen.findByRole('heading', { name: 'O login está indisponível agora' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo da tela')).not.toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(recarregar).toHaveBeenCalledTimes(1)
  })
})

describe('menu da área interna', () => {
  it('numa tela de detalhe, o menu marca exatamente um item como página atual', async () => {
    verificarSessaoMock.mockResolvedValue('autenticado')
    server.use(
      http.get(`${API_URL}/interno/provedores`, () =>
        HttpResponse.json({ items: [], totalCount: 0, page: 1, pageSize: 200, totalPages: 0 }),
      ),
    )

    renderizarAreaInterna('/interno/provedores/5/versoes/7')

    // Na suíte completa, montar o layout real demora mais que o padrão: a espera é pela sessão.
    const espera = { timeout: ESPERA_DO_LAYOUT_NA_SUITE }
    await waitFor(() => expect(screen.queryByText(/Verificando sua sessão/)).toBeNull(), espera)
    const menu = await screen.findByRole(
      'navigation',
      { name: 'Navegação da área interna' },
      espera,
    )
    await screen.findByText('Conteúdo da tela', undefined, espera)

    const marcados = menu.querySelectorAll('[aria-current="page"]')
    expect(marcados).toHaveLength(1)
    expect(within(menu).getByRole('link', { name: 'Provedores' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

describe('useNoIndex: noindex em /interno/**', () => {
  it('adiciona <meta name="robots" content="noindex, nofollow"> ao montar e remove ao desmontar', () => {
    expect(document.querySelector('meta[name="robots"]')).toBeNull()

    const { unmount } = renderHook(() => useNoIndex())

    const meta = document.querySelector('meta[name="robots"]')
    expect(meta).not.toBeNull()
    expect(meta).toHaveAttribute('content', 'noindex, nofollow')

    unmount()

    expect(document.querySelector('meta[name="robots"]')).toBeNull()
  })
})
