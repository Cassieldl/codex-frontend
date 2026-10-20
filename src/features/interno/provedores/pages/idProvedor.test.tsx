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
import { IdProvedorPage } from './idProvedor'

const API_URL = import.meta.env.VITE_API_URL

const ID_PROVEDOR = 1
const ID_AVISO = 7

/** Estado do servidor de mentira: publicar troca a flag e avança a versão, como o `xmin` real. */
function criarServidorDeAviso() {
  const aviso = { publicado: false, versaoConcorrencia: 3, corpo: 'Renove o certificado A1.' }
  const ifMatchRecebidos: (string | null)[] = []

  // JSON transcrito de `ProvedorAdminDetalheDto`/`AvisoAdminDto`, sem anotação do tipo do cliente.
  const provedorAtual = () => ({
    id: ID_PROVEDOR,
    slug: 'prefeitura-de-exemplo',
    nome: 'Prefeitura de Exemplo',
    categoria: 'Nacional',
    identificadorInvoicy: 'PREF-EXEMPLO',
    aliases: [],
    publicado: true,
    avisos: [
      {
        id: ID_AVISO,
        escopo: 'Provedor',
        provedorId: ID_PROVEDOR,
        versaoProvedorId: null,
        severidade: 'Informativo',
        titulo: 'Certificado digital expira em breve',
        corpo: aviso.corpo,
        vigenciaInicio: '2026-08-01',
        publicado: aviso.publicado,
        camposAfetadosIds: [],
        versaoConcorrencia: aviso.versaoConcorrencia,
      },
    ],
    versaoConcorrencia: 2,
  })

  server.use(
    http.get(`${API_URL}/interno/provedores/${ID_PROVEDOR}`, () =>
      HttpResponse.json({ data: provedorAtual(), message: null }),
    ),
    http.get(`${API_URL}/interno/provedores/${ID_PROVEDOR}/versoes`, () =>
      HttpResponse.json({ data: [], message: null }),
    ),
    http.get(`${API_URL}/interno/layout/versoes`, () =>
      HttpResponse.json({ items: [], totalCount: 0, page: 1, pageSize: 200, totalPages: 0 }),
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
      return HttpResponse.json({ data: provedorAtual().avisos[0], message: null })
    }),
  )

  /** Outro editor salvou o aviso depois da leitura desta tela. */
  function simularEdicaoConcorrente() {
    aviso.versaoConcorrencia += 1
    aviso.corpo = 'Renove o certificado A1 até sexta.'
  }

  return { ifMatchRecebidos, simularEdicaoConcorrente }
}

function renderizarPagina() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rotaRaiz = createRootRoute({ component: Outlet })
  const rotaDetalhe = createRoute({
    getParentRoute: () => rotaRaiz,
    path: '/interno/provedores/$provedorId',
    component: () => <IdProvedorPage provedorId={ID_PROVEDOR} />,
  })
  const router = createRouter({
    routeTree: rotaRaiz.addChildren([rotaDetalhe]),
    history: createMemoryHistory({ initialEntries: [`/interno/provedores/${ID_PROVEDOR}`] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  keycloak.tokenParsed = {
    resource_access: { 'codex-backend': { roles: ['provedores-buscar', 'avisos-publicar'] } },
  }
})

afterEach(() => {
  keycloak.tokenParsed = undefined
})

describe('IdProvedorPage: publicação de aviso', () => {
  it('publicar e em seguida despublicar o mesmo aviso usa o etag novo, e o rótulo acompanha', async () => {
    const { ifMatchRecebidos } = criarServidorDeAviso()
    const usuario = userEvent.setup()
    renderizarPagina()

    const item = (
      await screen.findByRole('heading', { name: 'Certificado digital expira em breve' })
    ).parentElement as HTMLElement

    await usuario.click(within(item).getByRole('button', { name: 'Publicar' }))
    await usuario.click(await within(item).findByRole('button', { name: 'Despublicar' }))

    expect(await within(item).findByRole('button', { name: 'Publicar' })).toBeInTheDocument()
    await waitFor(() => expect(ifMatchRecebidos).toEqual(['W/"3"', 'W/"4"']))
  })

  it('409 ao publicar mostra a mensagem junto do aviso, e a tentativa seguinte usa o etag relido', async () => {
    const { ifMatchRecebidos, simularEdicaoConcorrente } = criarServidorDeAviso()
    const usuario = userEvent.setup()
    renderizarPagina()

    const item = (
      await screen.findByRole('heading', { name: 'Certificado digital expira em breve' })
    ).parentElement as HTMLElement
    simularEdicaoConcorrente()

    await usuario.click(within(item).getByRole('button', { name: 'Publicar' }))

    expect(await within(item).findByRole('alert')).toHaveTextContent(
      'O aviso mudou desde a leitura.',
    )

    // O conflito relê o detalhe: a edição do outro editor aparece, e com ela o etag novo.
    expect(await within(item).findByText('Renove o certificado A1 até sexta.')).toBeInTheDocument()
    await usuario.click(within(item).getByRole('button', { name: 'Publicar' }))

    expect(await within(item).findByRole('button', { name: 'Despublicar' })).toBeInTheDocument()
    expect(ifMatchRecebidos).toEqual(['W/"3"', 'W/"4"'])
    expect(within(item).queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('IdProvedorPage: trilha', () => {
  it('o link para a lista de provedores não se marca como página atual', async () => {
    criarServidorDeAviso()
    const { container } = renderizarPagina()

    const linkDaLista = await screen.findByRole('link', { name: 'Provedores' })

    expect(linkDaLista).not.toHaveAttribute('aria-current')
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(0)
  })
})

describe('IdProvedorPage: publicação do provedor', () => {
  it.each([
    [
      409,
      'CONFLITO_CONCORRENCIA',
      'O provedor foi alterado por outra requisição. Recarregue e tente novamente.',
    ],
    [422, 'VALIDACAO_NEGOCIO', 'O provedor não pode ser despublicado no estado atual.'],
  ])('%i ao despublicar mostra a mensagem do servidor', async (status, code, message) => {
    keycloak.tokenParsed = {
      resource_access: { 'codex-backend': { roles: ['provedores-buscar', 'provedores-publicar'] } },
    }
    criarServidorDeAviso()
    server.use(
      http.put(`${API_URL}/interno/provedores/${ID_PROVEDOR}/publicacao`, () =>
        HttpResponse.json({ error: { code, message } }, { status }),
      ),
    )
    const usuario = userEvent.setup()
    renderizarPagina()

    await usuario.click(await screen.findByRole('button', { name: 'Despublicar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: 'Despublicar' })).toBeInTheDocument()
  })
})
