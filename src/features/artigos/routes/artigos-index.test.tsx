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
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { server } from '../../../test/mocks/server'
import type { ArtigoListaItem } from '../types/artigo'
import { ArtigosIndexPage } from './artigos-index'

const API_URL = import.meta.env.VITE_API_URL

const artigos: ArtigoListaItem[] = [
  {
    slug: 'identificar-a-versao-pelo-retorno',
    tipo: 'Procedimento',
    titulo: 'Identificar a versão pelo retorno',
    resumo: 'Como descobrir qual versão o município usa.',
    verificadoEm: '2026-08-14',
  },
  {
    slug: 'campo-ausente-nao-se-aplica',
    tipo: 'Conceito',
    titulo: 'Campo ausente quer dizer “não se aplica”',
    resumo: null,
    verificadoEm: null,
  },
]

const searchSchema = z.object({
  q: z.string().optional(),
  tipo: z.enum(['Conceito', 'Procedimento', 'Mudanca']).optional(),
  pagina: z.coerce.number().int().min(1).catch(1),
  origem: z.string().optional(),
})

/**
 * Replica a rota fina real (`src/routes/artigos/index.tsx`): mesmo schema de
 * `search`, mesma navegação por `search` — é o que torna a troca de aba
 * observável pela URL, e não só pelo mock de uma função.
 */
function renderPagina(urlInicial = '/artigos') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute({ component: Outlet })
  const rotaArtigos = createRoute({
    getParentRoute: () => rootRoute,
    path: '/artigos',
    validateSearch: searchSchema,
    component: ComponenteDaRota,
  })
  const rotaArtigo = createRoute({
    getParentRoute: () => rootRoute,
    path: '/artigos/$artigoSlug',
    component: () => null,
  })
  const rotaBusca = createRoute({
    getParentRoute: () => rootRoute,
    path: '/busca',
    validateSearch: (search: Record<string, unknown>) => search,
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaArtigos, rotaArtigo, rotaBusca])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [urlInicial] }),
  })

  function ComponenteDaRota() {
    const { q, tipo, pagina } = rotaArtigos.useSearch()
    const navigate = rotaArtigos.useNavigate()

    return (
      <ArtigosIndexPage
        q={q}
        tipo={tipo}
        pagina={pagina}
        navegar={(busca) => {
          // A rota de teste é montada fora da árvore registrada, então
          // `navigate` não infere o schema — o cast existe só aqui, não na
          // rota real (`src/routes/artigos/index.tsx`), que é tipada.
          const opcoes = {
            search: (anterior: Record<string, unknown>) => ({ ...anterior, ...busca }),
          }
          void navigate(opcoes as unknown as Parameters<typeof navigate>[0])
        }}
      />
    )
  }

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...utils, router }
}

function registrarHandler(
  responder: (url: URL) => { items: ArtigoListaItem[]; totalCount?: number },
) {
  const urlsChamadas: URL[] = []

  server.use(
    http.get(`${API_URL}/artigos`, ({ request }) => {
      const url = new URL(request.url)
      urlsChamadas.push(url)
      const { items, totalCount } = responder(url)
      return HttpResponse.json({
        items,
        totalCount: totalCount ?? items.length,
        page: Number(url.searchParams.get('pagina') ?? 1),
        pageSize: 25,
        totalPages: 1,
      })
    }),
  )

  return urlsChamadas
}

describe('ArtigosIndexPage — tela 7', () => {
  it('lista os artigos do acervo com tipo, título e selo', async () => {
    registrarHandler(() => ({ items: artigos }))

    renderPagina()

    expect(
      await screen.findByRole('link', { name: 'Identificar a versão pelo retorno' }),
    ).toBeInTheDocument()
    // 'Procedimento' aparece na aba e na etiqueta do card — escopar no card
    // evita casar com a aba e dar falso positivo.
    const cards = screen.getAllByRole('article')
    expect(within(cards[0]!).getByText('Procedimento')).toBeInTheDocument()
    expect(within(cards[1]!).getByText('Conceito')).toBeInTheDocument()
  })

  it('trocar de aba muda a URL e refaz a consulta com o tipo filtrado', async () => {
    const urls = registrarHandler((url) => {
      const tipo = url.searchParams.get('tipo')
      return { items: tipo ? artigos.filter((artigo) => artigo.tipo === tipo) : artigos }
    })
    const usuario = userEvent.setup()

    const { router } = renderPagina()
    await screen.findByRole('link', { name: 'Identificar a versão pelo retorno' })

    await usuario.click(screen.getByRole('link', { name: 'Conceito' }))

    await waitFor(() => expect(router.state.location.search).toMatchObject({ tipo: 'Conceito' }))
    await waitFor(() => expect(urls.at(-1)?.searchParams.get('tipo')).toBe('Conceito'))
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Identificar a versão pelo retorno' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('a aba ativa é a do tipo na URL, e só ela tem aria-current', async () => {
    registrarHandler(() => ({ items: [] }))

    renderPagina('/artigos?tipo=Mudanca')

    const abaAtiva = await screen.findByRole('link', { name: 'Mudança/Migração' })
    expect(abaAtiva).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Todos' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Conceito' })).not.toHaveAttribute('aria-current')
  })

  it('tipo sem acervo mostra o estado nomeado, nunca "nenhum item encontrado"', async () => {
    registrarHandler(() => ({ items: [] }))

    renderPagina('/artigos?tipo=Mudanca')

    expect(
      await screen.findByText('Ainda não há artigo de Mudança/Migração publicado.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Nenhum item encontrado.')).not.toBeInTheDocument()
  })

  it('tipo com termo buscado e zero resultados é "busca sem resultado", não acervo vazio', async () => {
    registrarHandler(() => ({ items: [] }))

    renderPagina('/artigos?tipo=Conceito&q=nota')

    expect(
      await screen.findByText('Nenhum artigo de Conceito corresponde à sua busca.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Ainda não há artigo/)).not.toBeInTheDocument()
  })

  it('aba "Todos" vazia cai no vazio genérico, sem nomear nenhum tipo', async () => {
    registrarHandler(() => ({ items: [] }))

    renderPagina('/artigos')

    expect(await screen.findByText(/Nenhum artigo publicado ainda/)).toBeInTheDocument()
    expect(screen.queryByText(/Ainda não há artigo de/)).not.toBeInTheDocument()
  })

  it('buscar preserva o parâmetro origem na URL (PQ-10)', async () => {
    registrarHandler(() => ({ items: artigos }))
    const usuario = userEvent.setup()

    const { router } = renderPagina('/artigos?origem=atendimento')
    await screen.findByRole('link', { name: 'Identificar a versão pelo retorno' })

    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar artigo' }), 'versao{Enter}')

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        q: 'versao',
        origem: 'atendimento',
        pagina: 1,
      }),
    )
  })

  it('erro na consulta mostra o ErrorState com retentar', async () => {
    server.use(
      http.get(`${API_URL}/artigos`, () =>
        HttpResponse.json(
          { error: { code: 'ERRO_INTERNO', message: 'Ocorreu um erro inesperado.' } },
          { status: 500 },
        ),
      ),
    )

    renderPagina()

    expect(await screen.findByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
  })
})

describe('ArtigosIndexPage: título da aba', () => {
  it('nomeia a aba "Artigos | Codex"', async () => {
    registrarHandler(() => ({ items: artigos }))

    renderPagina()

    await screen.findByRole('link', { name: 'Identificar a versão pelo retorno' })
    expect(document.title).toBe('Artigos | Codex')
  })
})
