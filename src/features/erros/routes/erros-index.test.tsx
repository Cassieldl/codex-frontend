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
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { server } from '../../../test/mocks/server'
import { montarLinkSuporte } from '../../../utils/linkSuporte'
import { ErrosIndexPage } from './erros-index'

const API_URL = import.meta.env.VITE_API_URL

// `ErrosIndexPage` embute `CabecalhoPublico` (M31), que usa `<Link>` do
// TanStack Router — precisa de um `RouterProvider` de verdade no teste,
// não só `QueryClientProvider`. `codigo`/`navigate` continuam injetados por
// prop (não por `Route.useSearch()`), o que mantém a asserção de
// redirecionamento simples: basta inspecionar o mock, sem ler a URL do router.
function renderPagina(codigo: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const navigate = vi.fn()

  const rootRoute = createRootRoute({ component: Outlet })
  const rotaErros = createRoute({
    getParentRoute: () => rootRoute,
    path: '/erros',
    component: () => <ErrosIndexPage codigo={codigo} navigate={navigate} />,
  })
  const routeTree = rootRoute.addChildren([rotaErros])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/erros'] }),
  })

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...utils, navigate }
}

function respostaPaginada(items: object[], totalCount = items.length) {
  return HttpResponse.json({ items, totalCount, page: 1, pageSize: 50, totalPages: 1 })
}

describe('ErrosIndexPage — /erros?codigo=', () => {
  it('totalCount === 1 navega direto para a página do erro', async () => {
    // JSON literal transcrito de ErroListaItemDto, sem o tipo do cliente.
    const item = {
      slug: 'e0117-ipm-sistemas',
      codigo: 'E0117',
      titulo: 'CNPJ do tomador inválido',
      origem: 'Prefeitura',
      provedorNome: 'IPM Sistemas',
    }
    server.use(http.get(`${API_URL}/erros`, () => respostaPaginada([item])))

    const { navigate } = renderPagina('E0117')

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ href: '/erros/e0117-ipm-sistemas', replace: true }),
    )
  })

  it('totalCount > 1 renderiza a lista de desambiguação, sem navegar', async () => {
    const itemA = {
      slug: 'e0117-ipm-sistemas',
      codigo: 'E0117',
      titulo: 'CNPJ do tomador inválido',
      origem: 'Prefeitura',
      provedorNome: 'IPM Sistemas',
    }
    const itemB = {
      slug: 'e0117-betha-sistemas',
      codigo: 'E0117',
      titulo: 'Código de verificação inválido',
      origem: 'Prefeitura',
      provedorNome: 'Betha Sistemas',
    }
    server.use(http.get(`${API_URL}/erros`, () => respostaPaginada([itemA, itemB])))

    const { navigate } = renderPagina('E0117')

    expect(await screen.findByText('IPM Sistemas')).toBeInTheDocument()
    expect(screen.getByText('Betha Sistemas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /IPM Sistemas/ })).toHaveAttribute(
      'href',
      '/erros/e0117-ipm-sistemas',
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('desambiguação mostra "Geral" (nunca "—") quando o item não tem provedor (U9)', async () => {
    const itemGeral = {
      slug: 'e0117-geral',
      codigo: 'E0117',
      titulo: 'Erro genérico de schema',
      origem: 'Schema',
      provedorNome: null,
    }
    const itemProvedor = {
      slug: 'e0117-ipm-sistemas',
      codigo: 'E0117',
      titulo: 'CNPJ do tomador inválido',
      origem: 'Prefeitura',
      provedorNome: 'IPM Sistemas',
    }
    server.use(http.get(`${API_URL}/erros`, () => respostaPaginada([itemGeral, itemProvedor])))

    renderPagina('E0117')

    expect(await screen.findByText('Geral')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('totalCount === 0 cai no estado "não encontrado", sem navegar e sem aparência de erro', async () => {
    server.use(http.get(`${API_URL}/erros`, () => respostaPaginada([])))

    const { navigate } = renderPagina('E9999')

    expect(
      await screen.findByText('Nenhum erro encontrado com o código "E9999".'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Falar com o suporte' })).toHaveAttribute(
      'href',
      montarLinkSuporte('Codex · código de erro não encontrado', 'Código buscado: E9999'),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})

/**
 * Com o parâmetro vazio a query fica desabilitada e nunca há `data`, então nenhum dos estados de
 * resultado casa. Sem um caso próprio, a rota renderizava um `<main>` sem um único nó — a tela
 * morta que a regra de estados de UI existe para impedir.
 */
describe('ErrosIndexPage — sem código na URL', () => {
  it('explica o que a página faz e oferece a busca, em vez de tela vazia', async () => {
    renderPagina('')

    expect(await screen.findByText('Nenhum código de erro foi informado.')).toBeInTheDocument()
    expect(screen.getByText('Busque pelo código ou pela mensagem do erro.')).toBeInTheDocument()

    // O `search` explícito é exigido pelo tipo da rota, que valida `q` — daí o href sair com o
    // parâmetro vazio, que é o estado inicial da busca.
    expect(screen.getByRole('link', { name: 'Buscar no Codex' })).toHaveAttribute(
      'href',
      '/busca?q=',
    )
  })

  it('tem exatamente um h1, que diz o que faltou no endereço', async () => {
    renderPagina('')

    await screen.findByText('Nenhum código de erro foi informado.')

    const titulos = screen.getAllByRole('heading', { level: 1 })
    expect(titulos).toHaveLength(1)
    expect(titulos[0]).toHaveTextContent('Nenhum código de erro foi informado.')
  })

  it('não consulta a API quando não há código para consultar', async () => {
    const chamadas: string[] = []
    const registrar = ({ request }: { request: Request }) => chamadas.push(request.url)
    server.events.on('request:start', registrar)
    onTestFinished(() => server.events.removeListener('request:start', registrar))

    renderPagina('   ')

    await screen.findByText('Nenhum código de erro foi informado.')

    expect(chamadas.filter((url) => url.includes('/erros'))).toHaveLength(0)
  })
})

describe('ErrosIndexPage: título da aba', () => {
  const itemIpm = {
    slug: 'e0117-ipm-sistemas',
    codigo: 'E0117',
    titulo: 'CNPJ do tomador inválido',
    origem: 'Prefeitura',
    provedorNome: 'IPM Sistemas',
  }
  const itemBetha = {
    slug: 'e0117-betha',
    codigo: 'E0117',
    titulo: 'Código de verificação inválido',
    origem: 'Prefeitura',
    provedorNome: 'Betha Sistemas',
  }

  it('sem código, nomeia a aba pelo que faltou', async () => {
    renderPagina('')

    await screen.findByText('Nenhum código de erro foi informado.')
    expect(document.title).toBe('Código de erro não informado | Codex')
  })

  it('código em mais de um provedor nomeia a aba com o código', async () => {
    server.use(http.get(`${API_URL}/erros`, () => respostaPaginada([itemIpm, itemBetha])))
    renderPagina('E0117')

    await screen.findByText('Betha Sistemas')
    expect(document.title).toBe('Código E0117 | Codex')
  })

  it('código sem erro encontrado diz isso na aba', async () => {
    server.use(http.get(`${API_URL}/erros`, () => respostaPaginada([])))
    renderPagina('E9999')

    await screen.findByText('Nenhum erro encontrado com o código "E9999".')
    expect(document.title).toBe('Código E9999 não encontrado | Codex')
  })
})
