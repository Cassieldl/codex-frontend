import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import { expect } from 'vitest'

export const TITULO_DESTINO = 'Destino da navegação'

export interface PortaoDeCarregamento {
  promessa: Promise<void>
  liberar: () => void
}

/**
 * Segura o carregamento da rota de destino. Em produção o destino é um chunk que ainda está
 * sendo baixado; é nessa janela que a localização do router já é o destino e a página de origem
 * continua montada.
 */
export function criarPortao(): PortaoDeCarregamento {
  let liberar = () => {}
  const promessa = new Promise<void>((resolver) => {
    liberar = resolver
  })

  return { promessa, liberar }
}

interface OpcoesRoteador {
  /** Rotas da página sob teste, filhas da raiz — as mesmas que a árvore real registra. */
  rotasDaPagina: (rotaRaiz: AnyRoute) => AnyRoute[]
  entradas: string[]
  indiceInicial?: number
  portao: PortaoDeCarregamento
}

/** Monta a página sob teste ao lado de duas rotas de destino cujo carregamento o portão controla. */
export function renderComDestinoLento({
  rotasDaPagina,
  entradas,
  indiceInicial = entradas.length - 1,
  portao,
}: OpcoesRoteador) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rotaRaiz = createRootRoute({ component: Outlet })

  const destino = () => <h1>{TITULO_DESTINO}</h1>
  const rotaLayout = createRoute({
    getParentRoute: () => rotaRaiz,
    path: '/layout',
    loader: () => portao.promessa,
    component: destino,
  })
  const rotaVersaoDoLayout = createRoute({
    getParentRoute: () => rotaRaiz,
    path: '/layout/$versaoSlug',
    loader: () => portao.promessa,
    component: destino,
  })
  const rotaBusca = createRoute({
    getParentRoute: () => rotaRaiz,
    path: '/busca',
    validateSearch: (search: Record<string, unknown>) => search,
    component: () => null,
  })

  const router = createRouter({
    routeTree: rotaRaiz.addChildren([
      ...rotasDaPagina(rotaRaiz),
      rotaLayout,
      rotaVersaoDoLayout,
      rotaBusca,
    ]),
    history: createMemoryHistory({ initialEntries: entradas, initialIndex: indiceInicial }),
  })

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...utils, router }
}

interface OpcoesSaida {
  router: { state: { location: { pathname: string } } }
  portao: PortaoDeCarregamento
  /** Dispara a saída (clique, `history.push`, `history.back`). */
  sair: () => void | Promise<void>
  caminhoDeDestino: string
}

/**
 * Sai da página enquanto o destino ainda carrega e prova que a página não desfaz a saída: a URL
 * continua sendo o destino depois de os efeitos da página rodarem, e o destino é o que acaba na
 * tela depois que o carregamento termina.
 */
export async function sairDaPaginaEEsperarDestino({
  router,
  portao,
  sair,
  caminhoDeDestino,
}: OpcoesSaida) {
  await sair()
  await waitFor(() => expect(router.state.location.pathname).toBe(caminhoDeDestino))

  // Descarrega os efeitos da página, que reagem à localização nova.
  await act(async () => {})
  expect(router.state.location.pathname).toBe(caminhoDeDestino)

  portao.liberar()

  expect(await screen.findByRole('heading', { name: TITULO_DESTINO })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe(caminhoDeDestino)
}
