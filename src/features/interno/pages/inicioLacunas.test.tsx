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
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { keycloak } from '../../../auth/keycloak'
import {
  TERMO_RECORRENTE,
  LACUNA_RECORRENTE,
  respostaListaTermos,
} from '../../../test/mocks/lacunasBusca'
import { server } from '../../../test/mocks/server'
import { InicioPage } from './inicio'

const API_URL = import.meta.env.VITE_API_URL

const ROLES_DA_FILA = ['lacunasbusca-buscar', 'lacunasbusca-adicionar', 'lacunasbusca-atualizar']

function autenticarCom(roles: string[]) {
  keycloak.tokenParsed = { resource_access: { 'codex-backend': { roles } } }
}

/** `GET /interno/busca` no shape real: `ApiResponse<ResultadoBusca>`, aqui sem nenhum resultado. */
function usarBuscaSemResultado() {
  server.use(
    http.get(`${API_URL}/interno/busca`, () =>
      HttpResponse.json({
        data: {
          termo: 'xyzzy',
          termoUsado: 'xyzzy',
          correcao: null,
          qualidade: 'vazia',
          totalGeral: 0,
          grupos: [],
          foraDoFiltro: null,
          filtroProvedor: null,
        },
        message: null,
      }),
    ),
  )
}

function usarFilaComUmTermo() {
  server.use(
    http.get(`${API_URL}/interno/lacunas-busca/termos`, () =>
      HttpResponse.json(respostaListaTermos([TERMO_RECORRENTE])),
    ),
  )
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

beforeEach(() => {
  autenticarCom(ROLES_DA_FILA)
})

afterEach(() => {
  keycloak.tokenParsed = undefined
})

describe('Início interno: busca sem resultado vira lacuna registrada', () => {
  it('registra no servidor o termo buscado com o parceiro e o chamado digitados', async () => {
    const usuario = userEvent.setup()
    const corpos: unknown[] = []
    usarBuscaSemResultado()
    usarFilaComUmTermo()
    server.use(
      http.post(`${API_URL}/interno/lacunas-busca`, async ({ request }) => {
        corpos.push(await request.json())
        return HttpResponse.json(
          { data: LACUNA_RECORRENTE, message: 'Lacuna registrada.' },
          { status: 201 },
        )
      }),
    )

    renderizarInicio()
    await usuario.type(await screen.findByRole('searchbox', { name: 'Buscar no Codex' }), 'xyzzy')
    await usuario.type(screen.getByLabelText('Parceiro'), 'Prefeitura de Exemplo')
    await usuario.type(screen.getByLabelText('Número do chamado'), '4521')

    await usuario.click(await screen.findByRole('button', { name: 'Registrar lacuna' }))

    await screen.findByText(/lacuna registrada\. ela entra na fila/i)
    expect(corpos).toEqual([
      { termo: 'xyzzy', parceiro: 'Prefeitura de Exemplo', numeroChamado: '4521' },
    ])
  })

  it('a cópia manual de nota saiu: não há mais "Copiar nota para o backlog"', async () => {
    const usuario = userEvent.setup()
    usarBuscaSemResultado()
    usarFilaComUmTermo()

    renderizarInicio()
    await usuario.type(await screen.findByRole('searchbox', { name: 'Buscar no Codex' }), 'xyzzy')
    await screen.findByRole('button', { name: 'Registrar lacuna' })

    expect(screen.queryByText(/copiar nota para o backlog/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/nunca enviado ao servidor/i)).not.toBeInTheDocument()
  })

  it('a fila "O que documentar a seguir" aparece com os termos abertos', async () => {
    usarFilaComUmTermo()

    renderizarInicio()

    expect(
      await screen.findByRole('heading', { name: 'O que documentar a seguir' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('E0117 ipm')).toBeInTheDocument()
  })

  it('sem a role de registrar não há parceiro, chamado nem botão - a busca vazia só informa', async () => {
    const usuario = userEvent.setup()
    autenticarCom(['lacunasbusca-buscar'])
    usarBuscaSemResultado()
    usarFilaComUmTermo()

    renderizarInicio()
    await usuario.type(await screen.findByRole('searchbox', { name: 'Buscar no Codex' }), 'xyzzy')

    expect(
      await screen.findByText('O Codex ainda não documenta esta rejeição.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar lacuna' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Parceiro')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Número do chamado')).not.toBeInTheDocument()
  })

  it('sem a role de buscar a fila não aparece nem é consultada', async () => {
    autenticarCom([])
    let consultas = 0
    server.use(
      http.get(`${API_URL}/interno/lacunas-busca/termos`, () => {
        consultas += 1
        return HttpResponse.json(respostaListaTermos([]))
      }),
    )

    renderizarInicio()

    expect(await screen.findByRole('searchbox', { name: 'Buscar no Codex' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'O que documentar a seguir' }),
    ).not.toBeInTheDocument()
    expect(consultas).toBe(0)
  })
})
