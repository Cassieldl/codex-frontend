import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { keycloak } from '../../../../auth/keycloak'
import { server } from '../../../../test/mocks/server'
import { IdVersaoPage } from './idVersao'

const API_URL = import.meta.env.VITE_API_URL

const ID_PROVEDOR = 1
const ID_VERSAO = 5
const ID_VERSAO_LAYOUT = 2
const ID_AVISO = 12

/** Estado do servidor de mentira: publicar troca a flag e avança a versão, como o `xmin` real. */
function criarServidorDeAviso() {
  const aviso = { publicado: true, versaoConcorrencia: 9 }
  const ifMatchRecebidos: (string | null)[] = []

  // JSON transcrito de `VersaoAdminDetalheDto`/`AvisoAdminDto`, sem anotação do tipo do cliente.
  const avisoAtual = () => ({
    id: ID_AVISO,
    escopo: 'Versao',
    provedorId: null,
    versaoProvedorId: ID_VERSAO,
    severidade: 'Alerta',
    titulo: 'ISSRetido passou a ser obrigatório',
    corpo: 'Primeiro parágrafo.',
    vigenciaInicio: '2026-10-05',
    publicado: aviso.publicado,
    camposAfetadosIds: [],
    versaoConcorrencia: aviso.versaoConcorrencia,
  })

  server.use(
    http.get(`${API_URL}/interno/provedores/${ID_PROVEDOR}`, () =>
      HttpResponse.json({
        data: {
          id: ID_PROVEDOR,
          slug: 'prefeitura-de-exemplo',
          nome: 'Prefeitura de Exemplo',
          categoria: 'Nacional',
          identificadorInvoicy: 'PREF-EXEMPLO',
          aliases: [],
          publicado: true,
          avisos: [],
          versaoConcorrencia: 2,
        },
        message: null,
      }),
    ),
    http.get(`${API_URL}/interno/versoes/${ID_VERSAO}`, () =>
      HttpResponse.json({
        data: {
          id: ID_VERSAO,
          provedorId: ID_PROVEDOR,
          versaoLayoutId: ID_VERSAO_LAYOUT,
          rotulo: 'Versão 1',
          introducao: null,
          verificadoEm: null,
          publicado: true,
          avisos: [avisoAtual()],
          versaoConcorrencia: 4,
        },
        message: null,
      }),
    ),
    http.get(`${API_URL}/interno/versoes/${ID_VERSAO}/campos`, () =>
      HttpResponse.json({ data: { campos: [], camposLayoutAusentes: [] }, message: null }),
    ),
    http.get(`${API_URL}/interno/layout/versoes/${ID_VERSAO_LAYOUT}/campos`, () =>
      HttpResponse.json({ data: [], message: null }),
    ),
    http.put(`${API_URL}/interno/avisos/${ID_AVISO}/publicacao`, async ({ request }) => {
      const ifMatch = request.headers.get('If-Match')
      ifMatchRecebidos.push(ifMatch)
      if (ifMatch !== `W/"${aviso.versaoConcorrencia}"`) {
        return HttpResponse.json(
          { error: { code: 'CONFLITO_CONCORRENCIA', message: 'O aviso mudou desde a leitura.' } },
          { status: 409 },
        )
      }

      const corpo = (await request.json()) as { publicado: boolean }
      aviso.publicado = corpo.publicado
      aviso.versaoConcorrencia += 1
      return HttpResponse.json({ data: avisoAtual(), message: null })
    }),
  )

  /** Outro editor salvou o aviso depois da leitura desta tela. */
  function simularEdicaoConcorrente() {
    aviso.versaoConcorrencia += 1
  }

  return { ifMatchRecebidos, simularEdicaoConcorrente }
}

function renderizarPagina() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rotaRaiz = createRootRoute({ component: Outlet })
  const rotaVersao = createRoute({
    getParentRoute: () => rotaRaiz,
    path: '/interno/provedores/$provedorId/versoes/$versaoId',
    component: () => <IdVersaoPage provedorId={ID_PROVEDOR} versaoId={ID_VERSAO} />,
  })
  const router = createRouter({
    routeTree: rotaRaiz.addChildren([rotaVersao]),
    history: createMemoryHistory({
      initialEntries: [`/interno/provedores/${ID_PROVEDOR}/versoes/${ID_VERSAO}`],
    }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  keycloak.tokenParsed = {
    resource_access: { 'codex-backend': { roles: ['versoesprovedor-buscar', 'avisos-publicar'] } },
  }
})

afterEach(() => {
  keycloak.tokenParsed = undefined
})

describe('IdVersaoPage: publicação de aviso', () => {
  it('despublicar e em seguida publicar o mesmo aviso usa o etag novo, e o rótulo acompanha', async () => {
    const { ifMatchRecebidos } = criarServidorDeAviso()
    const usuario = userEvent.setup()
    renderizarPagina()

    const item = (
      await screen.findByRole('heading', { name: 'ISSRetido passou a ser obrigatório' })
    ).parentElement as HTMLElement

    await usuario.click(within(item).getByRole('button', { name: 'Despublicar' }))
    await usuario.click(await within(item).findByRole('button', { name: 'Publicar' }))

    expect(await within(item).findByRole('button', { name: 'Despublicar' })).toBeInTheDocument()
    await waitFor(() => expect(ifMatchRecebidos).toEqual(['W/"9"', 'W/"10"']))
  })

  it('409 ao despublicar mostra a mensagem junto do aviso', async () => {
    const { simularEdicaoConcorrente } = criarServidorDeAviso()
    const usuario = userEvent.setup()
    renderizarPagina()

    const item = (
      await screen.findByRole('heading', { name: 'ISSRetido passou a ser obrigatório' })
    ).parentElement as HTMLElement
    simularEdicaoConcorrente()

    await usuario.click(within(item).getByRole('button', { name: 'Despublicar' }))

    expect(await within(item).findByRole('alert')).toHaveTextContent(
      'O aviso mudou desde a leitura.',
    )
  })
})

describe('IdVersaoPage: trilha', () => {
  it('nenhum dos dois ancestrais da trilha se marca como página atual', async () => {
    criarServidorDeAviso()
    const { container } = renderizarPagina()

    const linkDaLista = await screen.findByRole('link', { name: 'Provedores' })
    const linkDoProvedor = await screen.findByRole('link', { name: 'Prefeitura de Exemplo' })

    expect(linkDaLista).not.toHaveAttribute('aria-current')
    expect(linkDoProvedor).not.toHaveAttribute('aria-current')
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(0)
  })
})
