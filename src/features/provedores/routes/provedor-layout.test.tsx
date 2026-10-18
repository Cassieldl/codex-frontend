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
import { describe, expect, it, vi } from 'vitest'
import {
  COMUNICADO_CRITICO_DO_PROVEDOR,
  COMUNICADO_DE_VERSAO,
  COMUNICADO_GLOBAL,
  handlerComunicadosRegistrandoChamadas,
} from '../../../test/mocks/comunicadosContexto'
import { server } from '../../../test/mocks/server'
import type { ProvedorDetalhe } from '../types/provedor'
import { ProvedorLayoutPage } from './provedor-layout'

const API_URL = import.meta.env.VITE_API_URL

const provedorFake: ProvedorDetalhe = {
  slug: 'prefeitura-exemplo',
  nome: 'Prefeitura de Exemplo',
  categoria: 'Nacional',
  identificadorInvoicy: 'EXEMPLO',
  avisos: [],
  versoes: [
    {
      slug: 'v1',
      rotulo: 'Versão 1',
      verificadoEm: '2026-07-01T00:00:00Z',
      url: '/provedores/prefeitura-exemplo/v1',
    },
  ],
}

interface OpcoesRenderPagina {
  provedorSlug: string
  versaoSlugAtual?: string
  caminhoAtual: string
  /**
   * Deixa a política de retentativa do próprio hook valer. O padrão do harness
   * é `retry: false`, que é o que os testes de conteúdo querem — mas ele
   * **mascara** o que o hook decide, então quem testa retentativa precisa
   * desligá-lo.
   */
  usarRetentativaDoHook?: boolean
}

function renderPagina({
  provedorSlug,
  versaoSlugAtual,
  caminhoAtual,
  usarRetentativaDoHook = false,
}: OpcoesRenderPagina) {
  const queryClient = new QueryClient({
    defaultOptions: usarRetentativaDoHook
      ? { queries: { retryDelay: 0 } }
      : { queries: { retry: false } },
  })
  const navegar = vi.fn()

  // `<Link>`/`<Outlet>` exigem `RouterProvider` real — a árvore de teste só
  // precisa da rota que hospeda o componente (mesmo padrão de
  // `CabecalhoPublico.test.tsx`: os destinos dos `<Link>` não precisam estar
  // registrados para o `href` resolver).
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaLayout = createRoute({
    getParentRoute: () => rootRoute,
    path: caminhoAtual,
    component: () => (
      <ProvedorLayoutPage
        provedorSlug={provedorSlug}
        versaoSlugAtual={versaoSlugAtual}
        caminhoAtual={caminhoAtual}
        navegar={navegar}
      />
    ),
  })
  const routeTree = rootRoute.addChildren([rotaLayout])
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

function handlerProvedor(slugRequisitado: string, provedor: ProvedorDetalhe) {
  return http.get(`${API_URL}/provedores/${slugRequisitado}`, () =>
    HttpResponse.json({ data: provedor, message: null }),
  )
}

describe('ProvedorLayoutPage — correção de URL canônica (PQ-01/F2)', () => {
  it('não redireciona quando o caminho atual já é o canônico', async () => {
    server.use(handlerProvedor('prefeitura-exemplo', provedorFake))

    const { navegar } = renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    await screen.findByRole('heading', { level: 1, name: 'Prefeitura de Exemplo' })
    expect(navegar).not.toHaveBeenCalled()
  })

  it('redireciona para o slug novo quando o payload devolve um canônico divergente, sem versão', async () => {
    const provedorComSlugNovo: ProvedorDetalhe = { ...provedorFake, slug: 'slug-novo' }
    server.use(handlerProvedor('slug-antigo', provedorComSlugNovo))

    const { navegar } = renderPagina({
      provedorSlug: 'slug-antigo',
      caminhoAtual: '/provedores/slug-antigo',
    })

    await waitFor(() =>
      expect(navegar).toHaveBeenCalledWith({ href: '/provedores/slug-novo', replace: true }),
    )
    // Enquanto redireciona, o conteúdo não aparece no endereço não-canônico
    // (nunca um flash do slug antigo na aba/breadcrumb).
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('preserva o segmento de versão ao corrigir o slug do provedor', async () => {
    const provedorComSlugNovo: ProvedorDetalhe = { ...provedorFake, slug: 'slug-novo' }
    server.use(handlerProvedor('slug-antigo', provedorComSlugNovo))

    const { navegar } = renderPagina({
      provedorSlug: 'slug-antigo',
      versaoSlugAtual: 'v1',
      caminhoAtual: '/provedores/slug-antigo/v1',
    })

    await waitFor(() =>
      expect(navegar).toHaveBeenCalledWith({ href: '/provedores/slug-novo/v1', replace: true }),
    )
  })

  // Mutação-alvo (`analise-frontend.md` §2.9): trocar `replace: true` por
  // navegação normal empilharia histórico — "voltar" no navegador levaria de
  // volta ao slug morto. A asserção acima já cobre o valor exato de
  // `replace: true`; este teste reforça que `navegar` nunca é chamado com
  // outro valor além de `true`.
  it('o redirecionamento é sempre replace:true, nunca uma navegação que empilha histórico', async () => {
    const provedorComSlugNovo: ProvedorDetalhe = { ...provedorFake, slug: 'slug-novo' }
    server.use(handlerProvedor('slug-antigo', provedorComSlugNovo))

    const { navegar } = renderPagina({
      provedorSlug: 'slug-antigo',
      caminhoAtual: '/provedores/slug-antigo',
    })

    await waitFor(() => expect(navegar).toHaveBeenCalled())
    expect(navegar.mock.calls[0]![0]).toEqual({ href: '/provedores/slug-novo', replace: true })
  })
})

/**
 * `404` e `410` são respostas definitivas: o endereço não existe, ou existiu e
 * saiu do ar. Antes, só o `410` tinha ramo — o `404` caía no `ErrorState`
 * genérico, que diz "Não foi possível carregar esta informação agora. / Tentar
 * novamente" e convida o leitor a insistir num provedor que não existe. O tipo
 * `'nao_encontrado'` era classificado pelo hook e consumido por ninguém.
 *
 * A asserção de ausência do botão importa tanto quanto a presença do título: é
 * ela que prova que o caso não caiu no balde genérico.
 */
describe('ProvedorLayoutPage — endereços que não levam a lugar nenhum', () => {
  function handlerStatus(slug: string, status: number) {
    return http.get(`${API_URL}/provedores/${slug}`, () => new HttpResponse(null, { status }))
  }

  it('404 explica que o provedor não existe, sem oferecer nova tentativa', async () => {
    server.use(handlerStatus('nao-existe', 404))

    renderPagina({ provedorSlug: 'nao-existe', caminhoAtual: '/provedores/nao-existe' })

    await screen.findByRole('heading', { level: 1, name: 'Este provedor não existe.' })
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todos os provedores' })).toBeInTheDocument()
  })

  it('provedor inexistente nomeia a aba pelo desfecho', async () => {
    server.use(handlerStatus('nao-existe', 404))

    renderPagina({ provedorSlug: 'nao-existe', caminhoAtual: '/provedores/nao-existe' })

    await screen.findByRole('heading', { level: 1, name: 'Este provedor não existe.' })
    expect(document.title).toBe('Provedor não encontrado | Codex')
  })

  it('410 explica que o provedor saiu do ar, sem oferecer nova tentativa', async () => {
    server.use(handlerStatus('saiu-do-ar', 410))

    renderPagina({ provedorSlug: 'saiu-do-ar', caminhoAtual: '/provedores/saiu-do-ar' })

    await screen.findByRole('heading', { level: 1, name: 'Este provedor saiu do ar.' })
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument()
  })

  // O contraponto: 5xx PODE melhorar sozinho, então continua oferecendo a
  // tentativa. Sem este caso, trocar o `ErrorState` por uma tela de "não
  // existe" em tudo passaria despercebido.
  it('500 continua oferecendo nova tentativa', async () => {
    server.use(handlerStatus('instavel', 500))

    renderPagina({ provedorSlug: 'instavel', caminhoAtual: '/provedores/instavel' })

    expect(await screen.findByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
    expect(screen.queryByText('Este provedor não existe.')).not.toBeInTheDocument()
  })
})

/**
 * Retentar um `404` não muda a resposta — só segura a tela em "Carregando
 * provedor…" durante o backoff. Medido no navegador antes da correção: quatro
 * requisições ao mesmo endereço inexistente.
 */
describe('ProvedorLayoutPage — retentativa só no que pode melhorar', () => {
  function handlerContado(slug: string, status: number) {
    let chamadas = 0
    const handler = http.get(`${API_URL}/provedores/${slug}`, () => {
      chamadas += 1
      return new HttpResponse(null, { status })
    })

    return { handler, contar: () => chamadas }
  }

  it('não repete a requisição quando o provedor não existe', async () => {
    const { handler, contar } = handlerContado('nao-existe', 404)
    server.use(handler)

    renderPagina({
      provedorSlug: 'nao-existe',
      caminhoAtual: '/provedores/nao-existe',
      usarRetentativaDoHook: true,
    })

    await screen.findByRole('heading', { level: 1, name: 'Este provedor não existe.' })
    expect(contar()).toBe(1)
  })

  it('repete a requisição quando o erro pode ser passageiro', async () => {
    const { handler, contar } = handlerContado('instavel', 500)
    server.use(handler)

    renderPagina({
      provedorSlug: 'instavel',
      caminhoAtual: '/provedores/instavel',
      usarRetentativaDoHook: true,
    })

    await screen.findByRole('button', { name: /tentar novamente/i })
    expect(contar()).toBeGreaterThan(1)
  })
})

/**
 * Comunicado do provedor e das versões dele no topo da página — a instabilidade de quem está
 * emitindo não pode existir só na Home. O mesmo layout serve a página do provedor e a da versão:
 * o que muda é o `versao` que vai na consulta.
 */
describe('ProvedorLayoutPage — comunicados do contexto', () => {
  it('na página do provedor, consulta só o provedor e mostra a qual versão cada comunicado se refere', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([
      COMUNICADO_CRITICO_DO_PROVEDOR,
      COMUNICADO_DE_VERSAO,
    ])
    server.use(handlerProvedor('prefeitura-exemplo', provedorFake), handler)

    renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Instabilidade na emissão' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Prefeitura de Exemplo · 2.04')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver versão 2.04' })).toHaveAttribute(
      'href',
      '/provedores/prefeitura-exemplo/2-04',
    )
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]!.search).toBe('?provedor=prefeitura-exemplo')
  })

  it('na página da versão, a consulta leva o provedor e a versão', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([COMUNICADO_DE_VERSAO])
    server.use(handlerProvedor('prefeitura-exemplo', provedorFake), handler)

    renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      versaoSlugAtual: '2-04',
      caminhoAtual: '/provedores/prefeitura-exemplo/2-04',
    })

    await screen.findByRole('heading', { level: 3, name: 'Layout 2.04 em homologação' })
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]!.searchParams.get('provedor')).toBe('prefeitura-exemplo')
    expect(chamadas[0]!.searchParams.get('versao')).toBe('2-04')
  })

  it('o comunicado vem antes dos avisos do provedor e da barra de versões', async () => {
    const provedorComAviso: ProvedorDetalhe = {
      ...provedorFake,
      avisos: [
        {
          id: 9,
          escopo: 'provedor',
          severidade: 'Alerta',
          titulo: 'Aviso permanente',
          corpo: 'Texto do aviso.',
          vigenciaInicio: '2026-09-01',
          camposAfetados: [],
        },
      ],
    }
    const { handler } = handlerComunicadosRegistrandoChamadas([COMUNICADO_CRITICO_DO_PROVEDOR])
    server.use(handlerProvedor('prefeitura-exemplo', provedorComAviso), handler)

    renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    const comunicados = await screen.findByRole('region', { name: 'Comunicados ativos' })
    const avisos = await screen.findByRole('region', { name: 'Avisos do provedor' })
    const versoes = screen.getByRole('navigation', { name: 'Versões do provedor' })

    expect(
      comunicados.compareDocumentPosition(avisos) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(avisos.compareDocumentPosition(versoes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sem comunicado, não sobra bloco vazio', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(handlerProvedor('prefeitura-exemplo', provedorFake), handler)

    renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    await screen.findByRole('heading', { level: 1, name: 'Prefeitura de Exemplo' })
    await waitFor(() => expect(chamadas).toHaveLength(1))
    expect(screen.queryByRole('region', { name: 'Comunicados ativos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('a falha do endpoint de comunicados não derruba a página do provedor', async () => {
    server.use(
      handlerProvedor('prefeitura-exemplo', provedorFake),
      http.get(`${API_URL}/comunicados`, () => new HttpResponse(null, { status: 500 })),
    )

    renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Prefeitura de Exemplo' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Não foi possível verificar os comunicados agora.',
    )
    expect(screen.getByRole('navigation', { name: 'Versões do provedor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
  })

  it('provedor inexistente não consulta comunicado nenhum', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([COMUNICADO_GLOBAL])
    server.use(
      http.get(`${API_URL}/provedores/nao-existe`, () => new HttpResponse(null, { status: 404 })),
      handler,
    )

    renderPagina({ provedorSlug: 'nao-existe', caminhoAtual: '/provedores/nao-existe' })

    await screen.findByRole('heading', { level: 1, name: 'Este provedor não existe.' })
    expect(chamadas).toHaveLength(0)
  })
})
