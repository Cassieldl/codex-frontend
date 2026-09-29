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
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../../test/mocks/server'
import { handlerArtigoDetalhe } from '../../../test/mocks/handlers'
import type { ArtigoDetalhe } from '../types/artigo'
import { SLUG_COMO_FUNCIONA } from '../utils/slugsReservados'
import { ArtigoDetalhePage } from './artigo-detalhe'

const API_URL = import.meta.env.VITE_API_URL

const artigo: ArtigoDetalhe = {
  slug: 'identificar-a-versao-pelo-retorno',
  tipo: 'Procedimento',
  titulo: 'Identificar a versão pelo retorno',
  corpo: [
    '## Antes de começar',
    '',
    'Guarde o XML de retorno do município.',
    '',
    '### Onde olhar',
    '',
    'O nó de versão fica no cabeçalho.',
  ].join('\n'),
  verificadoEm: '2026-08-14',
  urlCanonica: '/artigos/identificar-a-versao-pelo-retorno',
  reservado: false,
  camposLayoutRelacionados: [
    {
      rotulo: 'CAMPO DO LAYOUT',
      slug: 'cnpj-tomador',
      nome: 'CNPJ do tomador',
      caminhoXml: 'Rps/Tomador/CpfCnpj/Cnpj',
      url: null,
    },
  ],
  errosRelacionados: [
    {
      rotulo: 'REJEIÇÃO',
      slug: 'e0117-cnpj-tomador-invalido',
      codigo: 'E0117',
      titulo: 'CNPJ do tomador inválido',
      url: '/erros/e0117-cnpj-tomador-invalido',
    },
  ],
}

interface OpcoesRender {
  artigoSlug: string
  caminhoAtual: string
  reservado?: boolean
}

function renderPagina({ artigoSlug, caminhoAtual, reservado }: OpcoesRender) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const navegar = vi.fn()

  const rootRoute = createRootRoute({ component: Outlet })
  const rotaArtigo = createRoute({
    getParentRoute: () => rootRoute,
    path: caminhoAtual,
    component: () => (
      <ArtigoDetalhePage
        artigoSlug={artigoSlug}
        caminhoAtual={caminhoAtual}
        reservado={reservado}
        navegar={navegar}
      />
    ),
  })
  const rotaBusca = createRoute({
    getParentRoute: () => rootRoute,
    path: '/busca',
    validateSearch: (search: Record<string, unknown>) => search,
    component: () => null,
  })
  const rotaErro = createRoute({
    getParentRoute: () => rootRoute,
    path: '/erros/$erroSlug',
    component: () => null,
  })
  // Destino da trilha de volta ao índice — o `<Link>` precisa da rota registrada na árvore.
  const rotaIndiceArtigos = createRoute({
    getParentRoute: () => rootRoute,
    path: '/artigos',
    validateSearch: (search: Record<string, unknown>) => search,
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaArtigo, rotaBusca, rotaErro, rotaIndiceArtigos])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [caminhoAtual] }),
  })

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...utils, navegar }
}

function handlerStatus(slug: string, status: number, code: string, message: string) {
  return http.get(`${API_URL}/artigos/${slug}`, () =>
    HttpResponse.json({ error: { code, message } }, { status }),
  )
}

describe('ArtigoDetalhePage — tela 8', () => {
  it('renderiza tipo, título, selo de verificação, corpo em Markdown e referências', async () => {
    server.use(handlerArtigoDetalhe(artigo))

    renderPagina({ artigoSlug: artigo.slug, caminhoAtual: artigo.urlCanonica })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Identificar a versão pelo retorno' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Procedimento')).toBeInTheDocument()
    // Data pura formatada como o dia que está no contrato — `parseISO`, nunca
    // `new Date`, que em fuso negativo exibiria o dia anterior.
    expect(screen.getByText('14 de agosto de 2026')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Antes de começar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Onde olhar' })).toBeInTheDocument()
    expect(screen.getByText('CNPJ do tomador')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /E0117 — CNPJ do tomador inválido/ }),
    ).toBeInTheDocument()
  })

  it('insere <link rel="canonical"> com a urlCanonica do contrato', async () => {
    server.use(handlerArtigoDetalhe(artigo))

    renderPagina({ artigoSlug: artigo.slug, caminhoAtual: artigo.urlCanonica })

    await waitFor(() =>
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
        '/artigos/identificar-a-versao-pelo-retorno',
      ),
    )
  })

  it('não redireciona quando o caminho atual já é o canônico', async () => {
    server.use(handlerArtigoDetalhe(artigo))

    const { navegar } = renderPagina({
      artigoSlug: artigo.slug,
      caminhoAtual: artigo.urlCanonica,
    })

    await screen.findByRole('heading', { level: 1 })
    expect(navegar).not.toHaveBeenCalled()
  })

  it('redireciona para urlCanonica quando o endereço atual diverge (§3.1)', async () => {
    const reservadoAcessadoPorArtigos: ArtigoDetalhe = {
      ...artigo,
      slug: SLUG_COMO_FUNCIONA,
      titulo: 'Como funciona o Codex',
      urlCanonica: '/como-funciona',
      reservado: true,
    }
    server.use(handlerArtigoDetalhe(reservadoAcessadoPorArtigos))

    const { navegar } = renderPagina({
      artigoSlug: SLUG_COMO_FUNCIONA,
      caminhoAtual: '/artigos/como-funciona',
    })

    await waitFor(() =>
      expect(navegar).toHaveBeenCalledWith({ href: '/como-funciona', replace: true }),
    )
    // Enquanto redireciona, o conteúdo não aparece no endereço não-canônico.
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Como funciona o Codex' }),
    ).not.toBeInTheDocument()
  })

  it('404 em slug comum mostra "não existe" — nunca o texto de despublicado', async () => {
    server.use(
      handlerStatus('nunca-existiu', 404, 'ARTIGO_NAO_ENCONTRADO', 'Artigo não encontrado.'),
    )

    renderPagina({ artigoSlug: 'nunca-existiu', caminhoAtual: '/artigos/nunca-existiu' })

    expect(await screen.findByText('Este artigo não existe.')).toBeInTheDocument()
    expect(screen.queryByText('Este artigo saiu do ar.')).not.toBeInTheDocument()
  })

  it('410 mostra "saiu do ar" com o motivo da API — nunca colapsa com 404 (M7)', async () => {
    server.use(
      handlerStatus('saiu-do-ar', 410, 'ARTIGO_DESPUBLICADO', 'Este artigo não está publicado.'),
    )

    renderPagina({ artigoSlug: 'saiu-do-ar', caminhoAtual: '/artigos/saiu-do-ar' })

    expect(await screen.findByText('Este artigo saiu do ar.')).toBeInTheDocument()
    expect(screen.getByText('Este artigo não está publicado.')).toBeInTheDocument()
    expect(screen.queryByText('Este artigo não existe.')).not.toBeInTheDocument()
  })

  it('erro inesperado (500) cai no ErrorState com retentar, não nas telas de 404/410', async () => {
    server.use(handlerStatus('explodiu', 500, 'ERRO_INTERNO', 'Ocorreu um erro inesperado.'))

    renderPagina({ artigoSlug: 'explodiu', caminhoAtual: '/artigos/explodiu' })

    expect(await screen.findByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
    expect(screen.queryByText('Este artigo não existe.')).not.toBeInTheDocument()
    expect(screen.queryByText('Este artigo saiu do ar.')).not.toBeInTheDocument()
  })

  it('mostra o estado de carregamento anunciado, nunca tela em branco', async () => {
    server.use(
      http.get(`${API_URL}/artigos/${artigo.slug}`, async () => {
        await delay(60)
        return HttpResponse.json({ data: artigo, message: null })
      }),
    )

    renderPagina({ artigoSlug: artigo.slug, caminhoAtual: artigo.urlCanonica })

    expect(await screen.findByText('Carregando o artigo…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})

describe('ArtigoDetalhePage — tela 9 (/como-funciona)', () => {
  it('404 do slug reservado mostra "ainda não publicado", nunca "não existe" (§4.2)', async () => {
    server.use(
      handlerStatus(SLUG_COMO_FUNCIONA, 404, 'ARTIGO_NAO_ENCONTRADO', 'Artigo não encontrado.'),
    )

    renderPagina({
      artigoSlug: SLUG_COMO_FUNCIONA,
      caminhoAtual: '/como-funciona',
      reservado: true,
    })

    expect(await screen.findByText('Este conteúdo ainda não foi publicado.')).toBeInTheDocument()
    expect(screen.queryByText('Este artigo não existe.')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para a busca' })).toBeInTheDocument()
  })

  it('quando o artigo reservado existe, renderiza o conteúdo sem redirecionar', async () => {
    const comoFunciona: ArtigoDetalhe = {
      ...artigo,
      slug: SLUG_COMO_FUNCIONA,
      tipo: 'Conceito',
      titulo: 'Como funciona o Codex',
      urlCanonica: '/como-funciona',
      reservado: true,
    }
    server.use(handlerArtigoDetalhe(comoFunciona))

    const { navegar } = renderPagina({
      artigoSlug: SLUG_COMO_FUNCIONA,
      caminhoAtual: '/como-funciona',
      reservado: true,
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Como funciona o Codex' }),
    ).toBeInTheDocument()
    expect(navegar).not.toHaveBeenCalled()
  })
})

/**
 * A página do provedor e a da versão do layout sempre tiveram trilha de volta; o artigo era a
 * única página de detalhe pública sem nenhuma — a volta ao índice dependia do menu principal.
 */
describe('ArtigoDetalhePage — trilha de volta ao índice', () => {
  it('liga "Artigos" ao índice e nomeia o artigo atual', async () => {
    server.use(handlerArtigoDetalhe(artigo))

    renderPagina({ artigoSlug: artigo.slug, caminhoAtual: artigo.urlCanonica })

    // Dentro do <article>: "Artigos" também é item do menu principal, e o teste tem de falhar
    // quando a trilha some — não passar por causa do cabeçalho.
    const corpo = await screen.findByRole('article')
    const linkIndice = within(corpo).getByRole('link', { name: 'Artigos' })

    expect(linkIndice).toHaveAttribute('href', expect.stringContaining('/artigos'))
    expect(linkIndice.parentElement).toHaveTextContent(`Artigos / ${artigo.titulo}`)

    // `/artigos` é ancestral de `/artigos/{slug}`: sem `activeOptions={{ exact: true }}` o Link
    // se marca sozinho como página atual por casamento de prefixo — o defeito reincidente desta
    // base. A asserção CONTA, porque "o item certo está marcado" passa com dois marcados.
    //
    // Hoje o search divergente (`{ pagina: 1 }` contra o search vazio do detalhe) já impediria a
    // marcação sozinho, então remover só o `exact` não derruba este caso — a mutação que o
    // derruba é alinhar o search E tirar o `exact`. O `exact` fica como a defesa explícita, que
    // continua valendo se o search da trilha mudar.
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0)
  })
})
