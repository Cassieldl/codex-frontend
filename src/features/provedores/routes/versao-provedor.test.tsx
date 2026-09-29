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
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import { VersaoProvedorPage } from './versao-provedor'

const API_URL = import.meta.env.VITE_API_URL

const PROVEDOR_SLUG = 'prefeitura-exemplo'
const VERSAO_SLUG = 'v1'
const CAMINHO = `/provedores/${PROVEDOR_SLUG}/${VERSAO_SLUG}`

interface OpcoesRender {
  /**
   * Deixa a política de retentativa do hook valer. O padrão é `retry: false`,
   * que serve aos testes de conteúdo mas **mascara** o que o hook decide.
   */
  usarRetentativaDoHook?: boolean
}

function renderPagina({ usarRetentativaDoHook = false }: OpcoesRender = {}) {
  const queryClient = new QueryClient({
    defaultOptions: usarRetentativaDoHook
      ? { queries: { retryDelay: 0 } }
      : { queries: { retry: false } },
  })

  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: CAMINHO,
    component: () => <VersaoProvedorPage provedorSlug={PROVEDOR_SLUG} versaoSlug={VERSAO_SLUG} />,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: [CAMINHO] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function handlerStatus(status: number, corpo?: unknown) {
  return http.get(`${API_URL}/provedores/${PROVEDOR_SLUG}/versoes/${VERSAO_SLUG}`, () =>
    corpo === undefined ? new HttpResponse(null, { status }) : HttpResponse.json(corpo, { status }),
  )
}

/**
 * O hook classifica quatro tipos por status; a tela tratava um. `nao_encontrado`
 * (404) e `limite_excedido` (422) caíam no `ErrorState` — "Não foi possível
 * carregar esta informação agora. / Tentar novamente" —, que promete que
 * insistir resolve. Nenhum dos dois melhora por insistência.
 *
 * A ausência do botão de nova tentativa é o que prova que o caso saiu do balde
 * genérico; só o título passaria se o `ErrorState` fosse renderizado junto.
 */
describe('VersaoProvedorPage — respostas definitivas', () => {
  it('404 explica que a versão não existe, sem oferecer nova tentativa', async () => {
    server.use(handlerStatus(404))

    renderPagina()

    await screen.findByRole('heading', { level: 1, name: 'Esta versão não existe.' })
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument()
  })

  it('410 explica que a versão saiu do ar, sem oferecer nova tentativa', async () => {
    server.use(handlerStatus(410, { error: { code: 'VERSAO_DESPUBLICADA' } }))

    renderPagina()

    await screen.findByRole('heading', { level: 1, name: 'Esta versão saiu do ar.' })
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument()
  })

  it('410 do provedor ancestral também explica, em vez de cair no erro genérico', async () => {
    server.use(handlerStatus(410, { error: { code: 'PROVEDOR_DESPUBLICADO' } }))

    renderPagina()

    await screen.findByRole('heading', { level: 1, name: 'Esta versão saiu do ar.' })
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument()
  })

  it('422 diz que a versão é grande demais, sem oferecer nova tentativa', async () => {
    server.use(handlerStatus(422))

    renderPagina()

    await screen.findByRole('heading', {
      level: 1,
      name: 'Esta versão é grande demais para abrir aqui.',
    })
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument()
  })

  // O contraponto: 5xx pode melhorar sozinho. Sem este caso, trocar o
  // `ErrorState` por uma tela de "não existe" em tudo passaria despercebido.
  it('500 continua oferecendo nova tentativa', async () => {
    server.use(handlerStatus(500))

    renderPagina()

    expect(await screen.findByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
    expect(screen.queryByText('Esta versão não existe.')).not.toBeInTheDocument()
  })

  it('toda resposta definitiva oferece a saída para as outras versões do provedor', async () => {
    server.use(handlerStatus(404))

    renderPagina()

    const saida = await screen.findByRole('link', { name: 'Ver outras versões deste provedor' })
    expect(saida).toHaveAttribute('href', `/provedores/${PROVEDOR_SLUG}`)
  })
})

describe('VersaoProvedorPage — retentativa só no que pode melhorar', () => {
  function handlerContado(status: number) {
    let chamadas = 0
    const handler = http.get(
      `${API_URL}/provedores/${PROVEDOR_SLUG}/versoes/${VERSAO_SLUG}`,
      () => {
        chamadas += 1
        return new HttpResponse(null, { status })
      },
    )

    return { handler, contar: () => chamadas }
  }

  it('não repete a requisição quando a versão não existe', async () => {
    const { handler, contar } = handlerContado(404)
    server.use(handler)

    renderPagina({ usarRetentativaDoHook: true })

    await screen.findByRole('heading', { level: 1, name: 'Esta versão não existe.' })
    expect(contar()).toBe(1)
  })

  it('repete a requisição quando o erro pode ser passageiro', async () => {
    const { handler, contar } = handlerContado(500)
    server.use(handler)

    renderPagina({ usarRetentativaDoHook: true })

    await screen.findByRole('button', { name: /tentar novamente/i })
    expect(contar()).toBeGreaterThan(1)
  })
})
