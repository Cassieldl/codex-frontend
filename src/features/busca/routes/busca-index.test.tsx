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
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../../test/mocks/server'
import type { ProvedorListaItem } from '../../provedores/types/provedor'
import type { ResultadoBusca } from '../types/resultadoBusca'
import { BuscaPage, type NavegarBuscaOpcoes } from './busca-index'

const API_URL = import.meta.env.VITE_API_URL

const IPM: ProvedorListaItem = {
  slug: 'ipm-sistemas',
  nome: 'IPM Sistemas',
  categoria: 'Nacional',
  verificadoEm: null,
  versoes: [],
}
const BETHA: ProvedorListaItem = {
  slug: 'betha-sistemas',
  nome: 'Betha Sistemas',
  categoria: 'Nacional',
  verificadoEm: null,
  versoes: [],
}

function respostaProvedores(items: ProvedorListaItem[]) {
  return HttpResponse.json({
    items,
    totalCount: items.length,
    page: 1,
    pageSize: 100,
    totalPages: 1,
  })
}

function resultadoBase(sobrescritas: Partial<ResultadoBusca> = {}): ResultadoBusca {
  return {
    termo: 'e0117',
    termoUsado: 'e0117',
    correcao: null,
    qualidade: 'exata',
    totalGeral: 0,
    grupos: [],
    foraDoFiltro: null,
    filtroProvedor: null,
    ...sobrescritas,
  }
}

function respostaBusca(resultado: ResultadoBusca) {
  return HttpResponse.json({ data: resultado, message: null })
}

// `BuscaPage` embute `CabecalhoPublico`, que usa `<Link>` do TanStack Router —
// precisa de um `RouterProvider` de verdade, não só `QueryClientProvider`.
// `navigate` continua injetado por prop (mesmo padrão de `erros-index.test.tsx`),
// o que mantém a asserção de sincronização de URL simples: basta inspecionar
// o mock, sem ler a URL do router.
function renderPagina(q: string, provedor?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const navigate = vi.fn<(opcoes: NavegarBuscaOpcoes) => void>()

  const rootRoute = createRootRoute({ component: Outlet })
  const rotaBusca = createRoute({
    getParentRoute: () => rootRoute,
    path: '/busca',
    component: () => <BuscaPage q={q} provedor={provedor} navigate={navigate} />,
  })
  const routeTree = rootRoute.addChildren([rotaBusca])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/busca'] }),
  })

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...utils, navigate }
}

function configurarUsuarioComClipboard() {
  const usuario = userEvent.setup()
  const escreverNaAreaDeTransferencia = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue(undefined)
  return { usuario, escreverNaAreaDeTransferencia }
}

describe('BuscaPage — filtro por provedor (P-01)', () => {
  it('escolher um provedor no seletor propaga a mudança para a URL (search.provedor)', async () => {
    server.use(
      http.get(`${API_URL}/provedores`, () => respostaProvedores([IPM, BETHA])),
      http.get(`${API_URL}/busca`, () => respostaBusca(resultadoBase())),
    )

    const usuario = userEvent.setup()
    const { navigate } = renderPagina('e0117')

    const seletor = await screen.findByRole('combobox', { name: 'Provedor' })
    await usuario.click(seletor)
    await usuario.click(await screen.findByRole('option', { name: 'IPM Sistemas' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    const opcoesChamada = navigate.mock.calls[0]![0]
    expect(opcoesChamada.replace).toBe(true)
    expect(opcoesChamada.search({ q: 'e0117', provedor: undefined })).toEqual({
      q: 'e0117',
      provedor: 'ipm-sistemas',
    })
  })

  it('provedor já presente na URL (reload) é reproduzido: seletor pré-selecionado e query enviada com o filtro', async () => {
    const requisicaoCapturada: { url: URL | null } = { url: null }
    server.use(
      http.get(`${API_URL}/provedores`, () => respostaProvedores([IPM, BETHA])),
      http.get(`${API_URL}/busca`, ({ request }) => {
        requisicaoCapturada.url = new URL(request.url)
        return respostaBusca(
          resultadoBase({ filtroProvedor: { slug: 'ipm-sistemas', nome: 'IPM Sistemas' } }),
        )
      }),
    )

    renderPagina('e0117', 'ipm-sistemas')

    const seletor = await screen.findByRole('combobox', { name: 'Provedor' })
    await waitFor(() => expect(within(seletor).getByText('IPM Sistemas')).toBeInTheDocument())

    await waitFor(() =>
      expect(requisicaoCapturada.url?.searchParams.get('provedor')).toBe('ipm-sistemas'),
    )
  })

  it('lista de provedores indisponível não quebra a busca — segue funcionando sem filtro', async () => {
    server.use(
      http.get(`${API_URL}/provedores`, () => HttpResponse.json(null, { status: 500 })),
      http.get(`${API_URL}/busca`, () =>
        respostaBusca(
          resultadoBase({
            grupos: [
              {
                tipo: 'erro',
                rotulo: 'Erros',
                total: 1,
                pontuacao: 1,
                itens: [
                  {
                    tipo: 'erro',
                    rotulo: 'Erro',
                    chave: 'e0117',
                    titulo: 'E0117 — CNPJ inválido',
                    url: '/erros/e0117',
                    provedorNome: null,
                    versaoRotulo: null,
                    versoes: null,
                    descricaoCasamento: 'Correspondência exata',
                    publicado: true,
                    meta: null,
                    pontuacao: 1,
                    trechos: [{ texto: 'CNPJ inválido', destacado: true }],
                  },
                ],
              },
            ],
          }),
        ),
      ),
    )

    renderPagina('e0117')

    expect(await screen.findByText('E0117 — CNPJ inválido')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    const seletor = screen.getByRole('combobox', { name: 'Provedor' })
    await userEvent.setup().click(seletor)
    const opcoes = screen.getAllByRole('option')
    expect(opcoes).toHaveLength(1)
    expect(opcoes[0]).toHaveTextContent('Todos os provedores')
  })
})

describe('BuscaPage — resultados fora do filtro (Achado #2, residual)', () => {
  it('"repetir a busca sem o filtro" é um <Link> client-side para /busca?q=, não um <a href> cru', async () => {
    server.use(
      http.get(`${API_URL}/provedores`, () => respostaProvedores([IPM])),
      http.get(`${API_URL}/busca`, () =>
        respostaBusca(
          resultadoBase({
            filtroProvedor: { slug: 'ipm-sistemas', nome: 'IPM Sistemas' },
            foraDoFiltro: { total: 3, tipos: ['erro'] },
          }),
        ),
      ),
    )

    renderPagina('e0117', 'ipm-sistemas')

    const link = await screen.findByRole('link', { name: 'repetir a busca sem o filtro' })
    expect(link).toHaveAttribute('href', '/busca?q=e0117')
  })
})

describe('BuscaPage — BotaoCopiar no estado vazio (P-02)', () => {
  it('termo sem resultado fica pronto para copiar, com aria-label específico — nunca "Copiar" genérico', async () => {
    server.use(
      http.get(`${API_URL}/provedores`, () => respostaProvedores([])),
      http.get(`${API_URL}/busca`, () =>
        respostaBusca(
          resultadoBase({ qualidade: 'vazia', termo: 'foobar123', termoUsado: 'foobar123' }),
        ),
      ),
    )

    const { escreverNaAreaDeTransferencia, usuario } = configurarUsuarioComClipboard()
    renderPagina('foobar123')

    expect(await screen.findByText('O Codex ainda não documenta "foobar123".')).toBeInTheDocument()

    const botaoCopiar = screen.getByRole('button', {
      name: 'Copiar termo buscado "foobar123"',
    })
    expect(screen.queryByRole('button', { name: 'Copiar' })).not.toBeInTheDocument()

    await usuario.click(botaoCopiar)
    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith('foobar123')

    // U2 — sem botão de "avisar o Codex"/registrar, só o caminho de suporte por e-mail
    // (a mesma ação aparece na área vazia e no rodapé contextual — nunca uma escrita anônima).
    const linksSuporte = screen.getAllByRole('link', { name: 'Falar com o suporte' })
    expect(linksSuporte.length).toBeGreaterThan(0)
    for (const link of linksSuporte) {
      expect(link).toHaveAttribute('href', expect.stringContaining('mailto:'))
    }
    expect(screen.queryByRole('button', { name: /avisar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /registrar/i })).not.toBeInTheDocument()
  })
})

/**
 * O filtro fica dentro do cabeçalho em gradiente escuro, ao lado do campo de busca. Com o rótulo
 * na cor padrão de superfície clara ele media 1,1:1 contra a ponta escura do gradiente — texto
 * presente no DOM e invisível na tela.
 */
describe('BuscaPage — filtro legível sobre o cabeçalho escuro', () => {
  it('declara o Select do cabeçalho na superfície escura', async () => {
    server.use(
      http.get(`${API_URL}/provedores`, () => respostaProvedores([IPM, BETHA])),
      http.get(`${API_URL}/busca`, () => respostaBusca(resultadoBase())),
    )

    renderPagina('e0117')

    const rotulo = await screen.findByText('Provedor')

    expect(rotulo).toHaveClass('text-white')
    expect(rotulo).not.toHaveClass('text-ink')
  })
})

describe('BuscaPage — título da página', () => {
  it('tem um único h1, para quem navega por títulos com leitor de tela', async () => {
    server.use(
      http.get(`${API_URL}/provedores`, () => respostaProvedores([IPM])),
      http.get(`${API_URL}/busca`, () => respostaBusca(resultadoBase())),
    )

    renderPagina('e0117')

    await screen.findByRole('combobox', { name: 'Provedor' })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Busca no Codex')
  })
})

describe('BuscaPage: título da aba', () => {
  it('leva o termo buscado: "Busca: valor | Codex"', async () => {
    server.use(
      http.get(`${API_URL}/provedores`, () => respostaProvedores([])),
      http.get(`${API_URL}/busca`, () =>
        respostaBusca(resultadoBase({ qualidade: 'vazia', termo: 'valor', termoUsado: 'valor' })),
      ),
    )
    renderPagina('valor')

    await screen.findByText('O Codex ainda não documenta "valor".')
    expect(document.title).toBe('Busca: valor | Codex')
  })

  it('sem termo, "Busca | Codex"', async () => {
    server.use(http.get(`${API_URL}/provedores`, () => respostaProvedores([])))
    renderPagina('')

    await screen.findByRole('heading', { level: 1, name: 'Busca no Codex' })
    expect(document.title).toBe('Busca | Codex')
  })
})
