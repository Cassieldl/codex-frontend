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
import { afterEach, describe, expect, it } from 'vitest'
import { keycloak } from '../../../auth/keycloak'
import { server } from '../../../test/mocks/server'
import {
  VERSAO_NUNCA_VERIFICADA,
  VERSAO_VERIFICADA_HA_90_DIAS,
  respostaListaVerificacoesVencidas,
} from '../../../test/mocks/verificacoesVencidas'
import { InicioPage } from './inicio'

const API_URL = import.meta.env.VITE_API_URL
const URL_LISTA = `${API_URL}/interno/versoes/verificacoes-vencidas`

function autenticarCom(roles: string[]) {
  keycloak.tokenParsed = { resource_access: { 'codex-backend': { roles } } }
}

function usarListaContandoPedidos() {
  const contagem = { pedidos: 0 }
  server.use(
    http.get(URL_LISTA, () => {
      contagem.pedidos += 1
      return HttpResponse.json(
        respostaListaVerificacoesVencidas([VERSAO_NUNCA_VERIFICADA, VERSAO_VERIFICADA_HA_90_DIAS]),
      )
    }),
  )
  return contagem
}

function renderizarInicio() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaInicio = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: InicioPage,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rotaInicio]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  keycloak.tokenParsed = undefined
})

describe('Início interno — verificações vencidas', () => {
  it('com a role de buscar versões, mostra a lista de verificações vencidas', async () => {
    autenticarCom(['versoesprovedor-buscar'])
    usarListaContandoPedidos()

    renderizarInicio()

    expect(
      await screen.findByRole('heading', { name: 'Verificações vencidas', level: 2 }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '1.0 Contrato' })).toBeInTheDocument()
  })

  it('sem a role, a seção não aparece e a lista nem é pedida ao servidor', async () => {
    autenticarCom([])
    const contagem = usarListaContandoPedidos()

    renderizarInicio()
    // Âncora de montagem: o RouterProvider monta de forma assíncrona e, antes dela, qualquer
    // asserção de ausência passaria só porque a tela ainda não existe.
    await screen.findByRole('heading', { name: 'Início' })

    expect(screen.queryByRole('heading', { name: 'Verificações vencidas' })).not.toBeInTheDocument()
    expect(contagem.pedidos).toBe(0)
  })
})
