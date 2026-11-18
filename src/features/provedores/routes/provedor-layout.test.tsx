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
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import {
  COMUNICADO_CRITICO_DO_PROVEDOR,
  COMUNICADO_DE_VERSAO,
  COMUNICADO_GLOBAL,
  handlerComunicadosRegistrandoChamadas,
} from '../../../test/mocks/comunicadosContexto'
import { handlerLayoutIndiceSucesso } from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import { ProvedorLayoutPage } from './provedor-layout'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de ProvedorDetalheDto, sem o tipo do cliente.
const provedorFake = {
  slug: 'prefeitura-exemplo',
  nome: 'Prefeitura de Exemplo',
  categoria: 'Nacional',
  identificadorInvoicy: 'EXEMPLO',
  avisos: [],
  versoes: [
    {
      slug: 'v1',
      rotulo: 'Versão 1',
      verificadoEm: '2026-07-01',
      url: '/provedores/prefeitura-exemplo/v1',
    },
  ],
}

// A versão publicada é a de `COMUNICADO_DE_VERSAO`, para o comunicado de escopo versão casar.
const provedorComVersao204 = {
  ...provedorFake,
  versoes: [
    {
      slug: '2-04',
      rotulo: '2.04',
      verificadoEm: '2026-07-01',
      url: '/provedores/prefeitura-exemplo',
    },
  ],
}

interface OpcoesRenderPagina {
  provedorSlug: string
  caminhoAtual: string
  /** Endereço com que o histórico começa, quando difere do caminho servido (ex.: com âncora). */
  entradaInicial?: string
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
  caminhoAtual,
  usarRetentativaDoHook = false,
  entradaInicial = caminhoAtual,
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
        caminhoAtual={caminhoAtual}
        navegar={navegar}
      />
    ),
  })
  const routeTree = rootRoute.addChildren([rotaLayout])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [entradaInicial] }),
  })

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...utils, navegar, router }
}

function handlerProvedor(slugRequisitado: string, provedor: object) {
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
    const provedorComSlugNovo = { ...provedorFake, slug: 'slug-novo' }
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

  // Mutação-alvo (`analise-frontend.md` §2.9): trocar `replace: true` por
  // navegação normal empilharia histórico — "voltar" no navegador levaria de
  // volta ao slug morto. A asserção acima já cobre o valor exato de
  // `replace: true`; este teste reforça que `navegar` nunca é chamado com
  // outro valor além de `true`.
  it('o redirecionamento é sempre replace:true, nunca uma navegação que empilha histórico', async () => {
    const provedorComSlugNovo = { ...provedorFake, slug: 'slug-novo' }
    server.use(handlerProvedor('slug-antigo', provedorComSlugNovo))

    const { navegar } = renderPagina({
      provedorSlug: 'slug-antigo',
      caminhoAtual: '/provedores/slug-antigo',
    })

    await waitFor(() => expect(navegar).toHaveBeenCalled())
    expect(navegar.mock.calls[0][0]).toEqual({ href: '/provedores/slug-novo', replace: true })
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
 * Comunicado do provedor e da versão publicada dele no topo da página: a instabilidade de quem
 * está emitindo não pode existir só na Home. A página não tem versão no endereço: a consulta leva
 * a versão publicada que P3 entregou primeiro.
 */
describe('ProvedorLayoutPage — comunicados do contexto', () => {
  it('consulta o provedor e a versão publicada, e mostra a qual versão cada comunicado se refere', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([
      COMUNICADO_CRITICO_DO_PROVEDOR,
      COMUNICADO_DE_VERSAO,
    ])
    server.use(handlerProvedor('prefeitura-exemplo', provedorComVersao204), handler)

    renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Instabilidade na emissão' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Layout 2.04 em homologação' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Prefeitura de Exemplo · 2.04')).toBeInTheDocument()
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0].searchParams.get('provedor')).toBe('prefeitura-exemplo')
    expect(chamadas[0].searchParams.get('versao')).toBe('2-04')
  })

  // A `url` do comunicado ainda pode vir com versão; o link é montado do slug e, apontando para a
  // página aberta, nem aparece.
  it('nenhum comunicado linka para um endereço com versão', async () => {
    const { handler } = handlerComunicadosRegistrandoChamadas([COMUNICADO_DE_VERSAO])
    server.use(handlerProvedor('prefeitura-exemplo', provedorComVersao204), handler)

    renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    await screen.findByRole('heading', { level: 3, name: 'Layout 2.04 em homologação' })
    expect(screen.queryByRole('link', { name: /Ver versão/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver provedor' })).not.toBeInTheDocument()
  })

  it('provedor sem versão publicada consulta só o provedor', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(handlerProvedor('prefeitura-exemplo', { ...provedorFake, versoes: [] }), handler)

    renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    await screen.findByRole('heading', { level: 1, name: 'Prefeitura de Exemplo' })
    await waitFor(() => expect(chamadas).toHaveLength(1))
    expect(chamadas[0].search).toBe('?provedor=prefeitura-exemplo')
  })

  it('mostra o comunicado sem barra de versões', async () => {
    const { handler } = handlerComunicadosRegistrandoChamadas([COMUNICADO_CRITICO_DO_PROVEDOR])
    server.use(handlerProvedor('prefeitura-exemplo', provedorFake), handler)

    renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    expect(await screen.findByRole('region', { name: 'Comunicados ativos' })).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Versões do provedor' }),
    ).not.toBeInTheDocument()
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

/**
 * Os avisos da busca levam a `/provedores/{slug}#avisos`. O alvo só monta depois que P3 responde,
 * então o navegador não rola sozinho: a página rola quando o conteúdo fica pronto.
 */
describe('ProvedorLayoutPage: âncora de antes das abas', () => {
  it('âncora de campo na raiz do provedor troca para a aba Campos, mantendo a âncora', async () => {
    server.use(handlerProvedor('prefeitura-exemplo', provedorFake))

    const { router } = renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
      entradaInicial: '/provedores/prefeitura-exemplo#campo-servico-discriminacao',
    })

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/provedores/prefeitura-exemplo/campos'),
    )
    expect(router.state.location.hash).toBe('campo-servico-discriminacao')
  })

  it('âncora que não é de aba nenhuma não tira o leitor do lugar', async () => {
    server.use(handlerProvedor('prefeitura-exemplo', provedorFake))

    const { router } = renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
      entradaInicial: '/provedores/prefeitura-exemplo#aviso-9',
    })

    await screen.findByRole('heading', { level: 1, name: 'Prefeitura de Exemplo' })
    expect(router.state.location.pathname).toBe('/provedores/prefeitura-exemplo')
  })
})

// JSON literal do conteúdo da versão, só com o que a moldura lê.
const versaoEscritaNoLayout8 = {
  provedor: {
    slug: 'prefeitura-exemplo',
    nome: 'Prefeitura de Exemplo',
    categoria: 'Nacional',
    identificadorInvoicy: 'EXEMPLO',
  },
  versao: {
    slug: 'v1',
    rotulo: 'Versão 1',
    verificadoEm: '2026-07-01',
    introducao: 'Lote de DPS síncrono do provedor, manual v1.01.',
    versaoLayoutRotulo: '8',
  },
  camposPorGrupo: [],
  totalCampos: 0,
  avisos: [],
  errosResumo: { total: 0, itens: [] },
  exemplos: [],
  naturezasOperacao: [],
  outrasVersoes: [],
}

describe('ProvedorLayoutPage: fatos abaixo do nome', () => {
  it('mostra os fatos em chips, alerta o layout que não é o vigente e recolhe a fonte', async () => {
    server.use(
      handlerProvedor('prefeitura-exemplo', provedorFake),
      http.get(`${API_URL}/provedores/prefeitura-exemplo/versoes/v1`, () =>
        HttpResponse.json({ data: versaoEscritaNoLayout8, message: null }),
      ),
      handlerLayoutIndiceSucesso({
        vigente: { slug: 'v9', rotulo: '9', estado: 'Vigente', ordem: 9, totalCampos: 10 },
      }),
    )

    renderPagina({
      provedorSlug: 'prefeitura-exemplo',
      caminhoAtual: '/provedores/prefeitura-exemplo',
    })

    await screen.findByText('Layout InvoiCy 8, vigente é a 9')
    const fatos = screen.getByRole('list', { name: 'Resumo do provedor' })
    expect(
      within(fatos)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Nacional', 'Versão 1', 'Layout InvoiCy 8, vigente é a 9', 'Verificado 01/07/2026'])

    expect(screen.getByText('Detalhes da fonte').closest('details')).not.toHaveAttribute('open')
    expect(screen.queryByText(/Escrita contra/)).not.toBeInTheDocument()
  })
})
