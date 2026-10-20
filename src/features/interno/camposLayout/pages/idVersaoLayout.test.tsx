import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { keycloak } from '../../../../auth/keycloak'
import { server } from '../../../../test/mocks/server'
import { IdVersaoLayoutPage } from './idVersaoLayout'

const API_URL = import.meta.env.VITE_API_URL

const ID_VERSAO_ATUAL = 5

/**
 * Transcrito do DTO do servidor, sem anotação de tipo do cliente: anotar faria o compilador impor
 * a forma que o cliente acredita, e o teste confirmaria a crença em vez do contrato.
 */
const VERSOES_DO_LAYOUT = [
  {
    id: ID_VERSAO_ATUAL,
    rotulo: '4.12',
    descricao: 'Grupo de retenções revisado.',
    estado: 'Vigente',
    ordem: 2,
    publicado: true,
    versaoConcorrencia: 1,
  },
  {
    id: 4,
    rotulo: '4.11',
    descricao: null,
    estado: 'Anterior',
    ordem: 1,
    publicado: true,
    versaoConcorrencia: 3,
  },
]

const CAMPOS_DA_VERSAO = [
  {
    id: 90,
    nome: 'Razão social do prestador',
    caminhoXml: '//Prestador/RazaoSocial',
    significado: 'Nome empresarial do prestador.',
    grupo: 'Prestador',
    ordem: 10,
    versaoLayoutId: ID_VERSAO_ATUAL,
    versaoDescontinuacaoId: null,
    publicado: true,
    versaoConcorrencia: 1,
  },
]

function handlers() {
  return [
    http.get(`${API_URL}/interno/layout/versoes`, () =>
      HttpResponse.json({
        items: VERSOES_DO_LAYOUT,
        totalCount: VERSOES_DO_LAYOUT.length,
        page: 1,
        pageSize: 200,
        totalPages: 1,
      }),
    ),
    http.get(`${API_URL}/interno/layout/versoes/${ID_VERSAO_ATUAL}/campos`, () =>
      HttpResponse.json({ data: CAMPOS_DA_VERSAO, message: null }),
    ),
  ]
}

function renderizarPagina() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/interno/campos-layout/$id',
    component: () => <IdVersaoLayoutPage versaoLayoutId={ID_VERSAO_ATUAL} />,
  })
  const rotaIndice = createRoute({
    getParentRoute: () => rootRoute,
    path: '/interno/campos-layout',
    component: () => null,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota, rotaIndice]),
    history: createMemoryHistory({ initialEntries: [`/interno/campos-layout/${ID_VERSAO_ATUAL}`] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  keycloak.tokenParsed = {
    resource_access: { 'codex-backend': { roles: ['campos-layout-buscar'] } },
  }
})

afterEach(() => {
  keycloak.tokenParsed = undefined
})

/**
 * A tela edita o vocabulário de UMA versão do layout, escolhida pela URL. Ela não dizia qual: com
 * mais de uma versão publicada, quem edita não tinha como saber onde estava salvando — e o erro
 * só apareceria no portal, já publicado.
 */
describe('IdVersaoLayoutPage — a versão que está sendo editada', () => {
  it('nomeia a versão no título e na trilha', async () => {
    server.use(...handlers())

    renderizarPagina()

    expect(
      await screen.findByRole('heading', {
        name: 'Campos canônicos do Layout InvoiCy versão 4.12',
      }),
    ).toBeInTheDocument()

    const linkIndice = screen.getByRole('link', { name: 'Campos do layout' })
    expect(linkIndice.parentElement).toHaveTextContent('Campos do layout / Versão 4.12')
  })

  it('não inventa rótulo enquanto a lista de versões não chegou', async () => {
    server.use(
      http.get(`${API_URL}/interno/layout/versoes`, () => new HttpResponse(null, { status: 500 })),
      http.get(`${API_URL}/interno/layout/versoes/${ID_VERSAO_ATUAL}/campos`, () =>
        HttpResponse.json({ data: CAMPOS_DA_VERSAO, message: null }),
      ),
    )

    renderizarPagina()

    // Âncora de montagem antes de afirmar ausência: sob `RouterProvider` o container começa vazio
    // e a asserção passaria sozinha.
    const titulo = await screen.findByRole('heading', { name: /Campos canônicos/ })

    expect(titulo).toHaveTextContent('Campos canônicos')
    expect(titulo).not.toHaveTextContent('undefined')
    expect(titulo).not.toHaveTextContent('Layout InvoiCy')
  })
})

describe('IdVersaoLayoutPage: trilha', () => {
  it('o link para a lista de versões não se marca como página atual', async () => {
    server.use(...handlers())

    const { container } = renderizarPagina()

    const linkIndice = await screen.findByRole('link', { name: 'Campos do layout' })

    expect(linkIndice).not.toHaveAttribute('aria-current')
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(0)
  })
})

describe('IdVersaoLayoutPage: publicação de campo canônico', () => {
  it('409 ao despublicar mostra a mensagem do servidor na linha do campo', async () => {
    keycloak.tokenParsed = {
      resource_access: {
        'codex-backend': { roles: ['campolayout-buscar', 'campolayout-publicar'] },
      },
    }
    server.use(
      ...handlers(),
      http.put(`${API_URL}/interno/campos-layout/90/publicacao`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONFLITO_CONCORRENCIA',
              message: 'O campo foi alterado por outra requisição. Recarregue e tente novamente.',
            },
          },
          { status: 409 },
        ),
      ),
    )
    const usuario = userEvent.setup()
    renderizarPagina()

    await screen.findByText('Razão social do prestador')
    const linha = () => screen.getByRole('row', { name: /Razão social do prestador/ })
    await usuario.click(within(linha()).getByRole('button', { name: 'Despublicar' }))

    expect(await within(linha()).findByRole('alert')).toHaveTextContent(
      'O campo foi alterado por outra requisição. Recarregue e tente novamente.',
    )
  })
})
