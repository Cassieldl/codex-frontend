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
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import {
  handlerCampoLayoutDespublicado,
  handlerCampoLayoutVerbeteSucesso,
} from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import type { CampoLayoutVerbete } from '../types/layoutPublico'
import { LayoutCampoResolucaoPage } from './layout-campo-resolucao'

const API_URL = import.meta.env.VITE_API_URL

const verbeteMinimo: CampoLayoutVerbete = {
  slug: 'numero-do-rps',
  nome: 'Número do RPS',
  caminhoXml: 'Nfse/Rps/IdentificacaoRps/Numero',
  significado: 'Numeração sequencial do recibo.',
  estado: 'Ativo',
  versaoExibicao: { slug: '4-12', rotulo: '4.12' },
  versaoOrigem: { slug: '4-10', rotulo: '4.10' },
  versaoDescontinuado: null,
  ondeEUsado: [],
}

function renderPagina(campoSlug: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const navegar = vi.fn()

  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/layout/campos/$campoSlug',
    component: () => <LayoutCampoResolucaoPage campoSlug={campoSlug} navegar={navegar} />,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: [`/layout/campos/${campoSlug}`] }),
  })

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...utils, navegar }
}

describe('LayoutCampoResolucaoPage', () => {
  it('redireciona para a versão de exibição com a âncora do campo, substituindo o histórico', async () => {
    server.use(
      handlerCampoLayoutVerbeteSucesso('numero-do-rps', {
        versaoExibicao: { slug: '4-12', rotulo: '4.12' },
        versaoOrigem: { slug: '4-10', rotulo: '4.10' },
      }),
    )

    const { navegar } = renderPagina('numero-do-rps')

    await waitFor(() =>
      expect(navegar).toHaveBeenCalledWith({
        to: '/layout/$versaoSlug',
        params: { versaoSlug: '4-12' },
        hash: 'campo-numero-do-rps',
        replace: true,
      }),
    )
  })

  /**
   * Mutação-alvo (`analise-frontend.md` §4.8): se a implementação passar a
   * derivar o destino de `ondeEUsado`, este teste cai — `versaoExibicao` é a
   * ÚNICA fonte da decisão (F-2), e a regra de qual versão abrir é do backend.
   */
  it('a decisão de destino ignora `ondeEUsado`, mesmo quando ele aponta outra versão', async () => {
    server.use(
      handlerCampoLayoutVerbeteSucesso('numero-do-rps', {
        versaoExibicao: { slug: '4-12', rotulo: '4.12' },
        versaoOrigem: { slug: '4-10', rotulo: '4.10' },
        ondeEUsado: [
          {
            provedorSlug: 'prefeitura-exemplo',
            provedorNome: 'Prefeitura de Exemplo',
            versaoSlug: 'versao-de-provedor',
            versaoRotulo: 'Versão de provedor',
          },
        ],
      }),
    )

    const { navegar } = renderPagina('numero-do-rps')

    await waitFor(() => expect(navegar).toHaveBeenCalled())
    expect(navegar.mock.calls[0]![0]).toEqual({
      to: '/layout/$versaoSlug',
      params: { versaoSlug: '4-12' },
      hash: 'campo-numero-do-rps',
      replace: true,
    })
    // E nada de `ondeEUsado` chega à tela — a página é um trampolim.
    expect(screen.queryByText('Prefeitura de Exemplo')).not.toBeInTheDocument()
  })

  it('anuncia que está localizando o campo enquanto resolve', async () => {
    server.use(
      http.get(`${API_URL}/layout/campos/numero-do-rps`, async () => {
        await delay(80)
        return HttpResponse.json({ data: verbeteMinimo, message: null })
      }),
    )
    renderPagina('numero-do-rps')

    expect(await screen.findByText('Localizando o campo no Layout InvoiCy…')).toBeInTheDocument()
  })

  it('404 diz que o campo não existe e não navega para lugar nenhum', async () => {
    server.use(
      http.get(`${API_URL}/layout/campos/inexistente`, () =>
        HttpResponse.json(
          { error: { code: 'CAMPO_LAYOUT_NAO_ENCONTRADO', message: 'Não encontrado.' } },
          { status: 404 },
        ),
      ),
    )

    const { navegar } = renderPagina('inexistente')

    expect(await screen.findByText('Este campo não existe no Layout InvoiCy.')).toBeInTheDocument()
    expect(navegar).not.toHaveBeenCalled()
  })

  // Os dois códigos levam à mesma tela de propósito: P12 só emite CAMPO_LAYOUT_DESPUBLICADO, e
  // uma tela separada para VERSAO_LAYOUT_DESPUBLICADA seria inalcançável em produção.
  it.each(['CAMPO_LAYOUT_DESPUBLICADO', 'VERSAO_LAYOUT_DESPUBLICADA'] as const)(
    '410 com %s explica que o verbete saiu do ar',
    async (codigo) => {
      server.use(handlerCampoLayoutDespublicado('numero-do-rps', codigo))

      renderPagina('numero-do-rps')

      expect(await screen.findByText('Este campo saiu do ar.')).toBeInTheDocument()
    },
  )

  it('erro sem desfecho nomeado cai no estado de erro genérico', async () => {
    server.use(
      http.get(`${API_URL}/layout/campos/numero-do-rps`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    )

    renderPagina('numero-do-rps')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
