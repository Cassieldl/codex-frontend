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
import { ID_SECAO_PROVEDORES_APLICAVEIS } from '../../../components/layout/RodapeContextual'
import { montarLinkSuporte } from '../../../utils/linkSuporte'
import { CONTEUDO_RODAPE_CONSTANTE } from '../../../utils/rodapeConteudoConstante'
import {
  COMUNICADO_CRITICO_DO_PROVEDOR,
  COMUNICADO_DE_VERSAO,
  COMUNICADO_GLOBAL,
  handlerComunicadosRegistrandoChamadas,
} from '../../../test/mocks/comunicadosContexto'
import { handlerErroDetalhePadrao } from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import { ErroDetalhePage } from './erro-detalhe'

const API_URL = import.meta.env.VITE_API_URL
const TEXTO_FALHA_COMUNICADOS = 'Não foi possível verificar os comunicados agora.'

// JSON literal transcrito de ErroDetalheDto, sem o tipo do cliente.
const erroBase = {
  slug: 'e0117-cnpj-tomador-invalido',
  codigo: 'E0117',
  origem: 'Prefeitura',
  titulo: 'CNPJ do tomador inválido',
  variantes: [],
  causaProvavel: null,
  solucaoSugerida: null,
  versoesAplicaveis: [],
  camposRelacionados: [],
  artigosRelacionados: [],
}

interface OpcoesRenderPagina {
  erroSlug: string
  caminhoAtual?: string
}

function renderPagina({ erroSlug, caminhoAtual = `/erros/${erroSlug}` }: OpcoesRenderPagina) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const navegar = vi.fn()

  const rootRoute = createRootRoute({ component: Outlet })
  const rotaErro = createRoute({
    getParentRoute: () => rootRoute,
    path: caminhoAtual,
    component: () => (
      <ErroDetalhePage erroSlug={erroSlug} caminhoAtual={caminhoAtual} navegar={navegar} />
    ),
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
  const rotaProvedor = createRoute({
    getParentRoute: () => rootRoute,
    path: '/provedores/$provedorSlug',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([rotaErro, rotaArtigo, rotaBusca, rotaProvedor])
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

describe('ErroDetalhePage — bloco de artigos relacionados (§5)', () => {
  it('sem artigos ligados (coleção vazia do contrato), a seção não aparece', async () => {
    server.use(handlerErroDetalhePadrao('e0117'))

    renderPagina({ erroSlug: 'e0117' })

    expect(await screen.findByRole('heading', { level: 1, name: 'E0117' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Artigos relacionados' })).not.toBeInTheDocument()
  })

  it('com artigos ligados, a seção lista os links depois dos campos relacionados', async () => {
    const erro = {
      ...erroBase,
      camposRelacionados: [
        {
          slug: 'cnpj-tomador',
          nome: 'CNPJ do tomador',
          caminhoXml: '//Tomador/TomaCNPJ',
          ancoras: [{ provedorSlug: 'ipm-sistemas', versaoSlug: '2-04' }],
        },
      ],
      artigosRelacionados: [
        {
          rotulo: 'ARTIGO',
          slug: 'campo-ausente-nao-se-aplica',
          tipo: 'Conceito',
          titulo: 'Campo ausente quer dizer “não se aplica”',
          url: '/artigos/campo-ausente-nao-se-aplica',
        },
      ],
    }
    server.use(
      http.get(`${API_URL}/erros/${erro.slug}`, () =>
        HttpResponse.json({ data: erro, message: null }),
      ),
    )

    renderPagina({ erroSlug: erro.slug })

    expect(await screen.findByRole('heading', { name: 'Artigos relacionados' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Campo ausente quer dizer “não se aplica”' }),
    ).toHaveAttribute('href', '/artigos/campo-ausente-nao-se-aplica')

    // Ordem de leitura: campos antes dos artigos, com os dois títulos presentes.
    const secoesRelacionadas = ['Campos relacionados', 'Artigos relacionados']
    const titulos = screen
      .getAllByRole('heading', { level: 2 })
      .map((titulo) => titulo.textContent)
      .filter((titulo) => titulo !== null && secoesRelacionadas.includes(titulo))
    expect(titulos).toEqual(secoesRelacionadas)
  })
})

describe('ErroDetalhePage — causa provável', () => {
  it('preserva a quebra entre a regra da Sefin e o lugar onde ela se aplica', async () => {
    // Formato da carga do Emissor Nacional: regra numa linha, caminho na seguinte.
    const causa = 'Regra da Sefin: O CNPJ do tomador deve ser válido.\nOnde: DPS/infDPS/toma/CNPJ'
    const erro = { ...erroBase, causaProvavel: causa }
    server.use(
      http.get(`${API_URL}/erros/${erro.slug}`, () =>
        HttpResponse.json({ data: erro, message: null }),
      ),
    )

    renderPagina({ erroSlug: erro.slug })

    await screen.findByRole('heading', { name: 'Causa provável' })
    const paragrafo = screen.getByText((_, elemento) => elemento?.textContent === causa)
    expect(paragrafo).toHaveClass('whitespace-pre-line')
  })
})

// F-4 (`arquitetura.md` §5.F) — `erro` nunca teve mecanismo de correção de
// slug. Estes testes travam que ele passou a ter, no mesmo padrão de
// `artigo-detalhe.test.tsx`.
describe('ErroDetalhePage — correção de URL canônica (F-4)', () => {
  it('não redireciona quando o caminho atual já é o canônico', async () => {
    server.use(handlerErroDetalhePadrao('e0117'))

    const { navegar } = renderPagina({ erroSlug: 'e0117' })

    await screen.findByRole('heading', { level: 1, name: 'E0117' })
    expect(navegar).not.toHaveBeenCalled()
  })

  it('redireciona para /erros/{slug} quando o endereço atual diverge do slug canônico', async () => {
    const erroComSlugNovo = { ...erroBase, slug: 'e0117-slug-novo' }
    server.use(
      http.get(`${API_URL}/erros/e0117-slug-antigo`, () =>
        HttpResponse.json({ data: erroComSlugNovo, message: null }),
      ),
    )

    const { navegar } = renderPagina({
      erroSlug: 'e0117-slug-antigo',
      caminhoAtual: '/erros/e0117-slug-antigo',
    })

    await waitFor(() =>
      expect(navegar).toHaveBeenCalledWith({ href: '/erros/e0117-slug-novo', replace: true }),
    )
    // Enquanto redireciona, o conteúdo não aparece no endereço não-canônico.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })
})

describe('ErroDetalhePage — rodapé: próximo passo e caminho ao suporte (§7.1/§7.2)', () => {
  const versaoIpm = {
    provedorSlug: 'ipm',
    provedorNome: 'IPM',
    versaoSlug: '2.04',
    versaoRotulo: '2.04',
  }
  const versaoBetha = {
    provedorSlug: 'betha',
    provedorNome: 'Betha',
    versaoSlug: '1.1',
    versaoRotulo: '1.1',
  }

  async function renderComErro(erro: { slug: string; codigo: string; [campo: string]: unknown }) {
    server.use(
      http.get(`${API_URL}/erros/${erro.slug}`, () =>
        HttpResponse.json({ data: erro, message: null }),
      ),
    )
    renderPagina({ erroSlug: erro.slug })

    // Âncora de montagem: o rodapé só reflete o erro depois que ele carrega.
    await screen.findByRole('heading', { level: 1, name: erro.codigo })

    return within(screen.getByRole('contentinfo'))
  }

  const hrefSuporteEsperado = `mailto:supportbr@migrate.info?subject=${encodeURIComponent(
    'Codex · erro E0117',
  )}&body=${encodeURIComponent('Código do erro: E0117')}`

  // Buscar já está no cabeçalho: o rodapé do erro geral fica só com o suporte.
  it('erro geral: oferece só o caminho ao suporte, com o código do erro', async () => {
    const rodape = await renderComErro({ ...erroBase, versoesAplicaveis: [] })

    expect(rodape.getByText(/Fale com o suporte levando o código/)).toBeInTheDocument()
    expect(rodape.queryByRole('link', { name: 'Buscar' })).not.toBeInTheDocument()
    expect(rodape.getByRole('link', { name: 'Falar com o suporte' })).toHaveAttribute(
      'href',
      hrefSuporteEsperado,
    )
  })

  it('erro em vários provedores: leva à lista de provedores da própria página e oferece o suporte', async () => {
    const rodape = await renderComErro({
      ...erroBase,
      versoesAplicaveis: [versaoIpm, versaoBetha],
    })

    expect(rodape.getByText(/aparece em mais de um provedor/)).toBeInTheDocument()
    const proximoPasso = rodape.getByRole('link', { name: 'Ver os provedores aplicáveis' })
    expect(proximoPasso).toHaveAttribute('href', `#${ID_SECAO_PROVEDORES_APLICAVEIS}`)
    expect(rodape.getByRole('link', { name: 'Falar com o suporte' })).toHaveAttribute(
      'href',
      hrefSuporteEsperado,
    )

    // O destino do próximo passo existe na página: a seção rotulada pelo título com esse id.
    const secao = screen.getByRole('region', { name: 'Provedores aplicáveis' })
    expect(secao).toHaveAttribute('aria-labelledby', ID_SECAO_PROVEDORES_APLICAVEIS)
    expect(document.getElementById(ID_SECAO_PROVEDORES_APLICAVEIS)).toBeInTheDocument()
  })

  it('erro em um único provedor: leva à página dele, sem versão, e ganha o caminho ao suporte', async () => {
    const rodape = await renderComErro({ ...erroBase, versoesAplicaveis: [versaoIpm] })

    expect(rodape.getByRole('link', { name: 'Ver o provedor completo' })).toHaveAttribute(
      'href',
      '/provedores/ipm',
    )
    expect(rodape.getByRole('link', { name: 'Falar com o suporte' })).toHaveAttribute(
      'href',
      hrefSuporteEsperado,
    )
    expect(
      rodape.queryByRole('link', { name: 'Ver os provedores aplicáveis' }),
    ).not.toBeInTheDocument()
  })

  it('o caminho ao suporte usa o e-mail e o montador do rodapé, com assunto e corpo do erro', async () => {
    const rodape = await renderComErro({ ...erroBase, versoesAplicaveis: [] })

    const href = rodape.getByRole('link', { name: 'Falar com o suporte' }).getAttribute('href')
    expect(href).toBe(montarLinkSuporte('Codex · erro E0117', 'Código do erro: E0117'))
    expect(href?.startsWith(`mailto:${CONTEUDO_RODAPE_CONSTANTE.atendimento.emailSuporte}?`)).toBe(
      true,
    )
  })
})

/**
 * A instabilidade do provedor aparece onde o leitor chega com o código do erro na mão. Uma
 * consulta só, com todos os provedores aplicáveis ao erro; o erro geral (sem versões) consulta
 * sem provedor e recebe só os comunicados globais.
 */
describe('ErroDetalhePage — comunicados do contexto', () => {
  function versaoAplicavel(provedorSlug: string, versaoSlug: string) {
    return {
      provedorSlug,
      provedorNome: `Provedor ${provedorSlug}`,
      versaoSlug,
      versaoRotulo: `Versão ${versaoSlug}`,
    }
  }

  function servirErro(erro: { slug: string }) {
    return http.get(`${API_URL}/erros/${erro.slug}`, () =>
      HttpResponse.json({ data: erro, message: null }),
    )
  }

  it('erro em várias versões de provedores diferentes: uma consulta com `provedor` repetido', async () => {
    const erro = {
      ...erroBase,
      versoesAplicaveis: [
        versaoAplicavel('prefeitura-a', 'v1'),
        versaoAplicavel('prefeitura-a', 'v2'),
        versaoAplicavel('prefeitura-b', 'v1'),
      ],
    }
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([
      COMUNICADO_CRITICO_DO_PROVEDOR,
    ])
    server.use(servirErro(erro), handler)

    renderPagina({ erroSlug: erro.slug })

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Instabilidade na emissão' }),
    ).toBeInTheDocument()
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0].search).toBe('?provedor=prefeitura-a&provedor=prefeitura-b')
  })

  it('erro em uma única versão: a consulta leva o provedor e a versão', async () => {
    const erro = {
      ...erroBase,
      versoesAplicaveis: [versaoAplicavel('prefeitura-a', 'v1')],
    }
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([COMUNICADO_DE_VERSAO])
    server.use(servirErro(erro), handler)

    renderPagina({ erroSlug: erro.slug })

    await screen.findByRole('heading', { level: 3, name: 'Layout 2.04 em homologação' })
    expect(chamadas[0].searchParams.getAll('provedor')).toEqual(['prefeitura-a'])
    expect(chamadas[0].searchParams.get('versao')).toBe('v1')
  })

  it('erro geral: consulta sem parâmetro e mostra só o que o servidor devolve (os globais)', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([COMUNICADO_GLOBAL])
    server.use(servirErro(erroBase), handler)

    renderPagina({ erroSlug: erroBase.slug })

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Manutenção programada da plataforma' }),
    ).toBeInTheDocument()
    expect(chamadas[0].search).toBe('')
  })

  it('com mais de 10 provedores aplicáveis, consulta os 10 primeiros', async () => {
    const erro = {
      ...erroBase,
      versoesAplicaveis: Array.from({ length: 12 }, (_, indice) =>
        versaoAplicavel(`prefeitura-${indice + 1}`, 'v1'),
      ),
    }
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(servirErro(erro), handler)

    renderPagina({ erroSlug: erro.slug })

    await screen.findByRole('heading', { level: 1, name: 'E0117' })
    await waitFor(() => expect(chamadas).toHaveLength(1))
    expect(chamadas[0].searchParams.getAll('provedor')).toEqual(
      Array.from({ length: 10 }, (_, indice) => `prefeitura-${indice + 1}`),
    )
  })

  it('o comunicado vem antes da causa provável', async () => {
    const erro = { ...erroBase, causaProvavel: 'Causa.' }
    const { handler } = handlerComunicadosRegistrandoChamadas([COMUNICADO_GLOBAL])
    server.use(servirErro(erro), handler)

    renderPagina({ erroSlug: erro.slug })

    const comunicados = await screen.findByRole('region', { name: 'Comunicados ativos' })
    const causa = screen.getByRole('region', { name: 'Causa provável' })

    expect(
      comunicados.compareDocumentPosition(causa) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('sem comunicado, não sobra bloco vazio', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(servirErro(erroBase), handler)

    renderPagina({ erroSlug: erroBase.slug })

    await screen.findByRole('heading', { level: 1, name: 'E0117' })
    await waitFor(() => expect(chamadas).toHaveLength(1))
    expect(screen.queryByRole('region', { name: 'Comunicados ativos' })).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_FALHA_COMUNICADOS)).not.toBeInTheDocument()
  })

  it('a falha do endpoint de comunicados não derruba a página do erro', async () => {
    server.use(
      servirErro(erroBase),
      http.get(`${API_URL}/comunicados`, () => new HttpResponse(null, { status: 500 })),
    )

    renderPagina({ erroSlug: erroBase.slug })

    expect(await screen.findByRole('heading', { level: 1, name: 'E0117' })).toBeInTheDocument()
    expect(await screen.findByText(TEXTO_FALHA_COMUNICADOS)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Causa provável' })).toBeInTheDocument()
  })

  it('erro inexistente não consulta comunicado nenhum', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([COMUNICADO_GLOBAL])
    server.use(
      http.get(`${API_URL}/erros/nao-existe`, () => new HttpResponse(null, { status: 404 })),
      handler,
    )

    renderPagina({ erroSlug: 'nao-existe' })

    await screen.findByRole('heading', { level: 1 })
    expect(chamadas).toHaveLength(0)
  })
})

describe('ErroDetalhePage: título da aba', () => {
  it('nomeia a aba com o código e o título do erro', async () => {
    server.use(
      http.get(`${API_URL}/erros/${erroBase.slug}`, () =>
        HttpResponse.json({ data: erroBase, message: null }),
      ),
    )
    renderPagina({ erroSlug: erroBase.slug })

    await screen.findByRole('heading', { level: 1, name: 'E0117' })
    expect(document.title).toBe('E0117: CNPJ do tomador inválido | Codex')
  })

  it('erro inexistente nomeia a aba pelo desfecho', async () => {
    server.use(
      http.get(`${API_URL}/erros/nao-existe`, () => new HttpResponse(null, { status: 404 })),
    )
    renderPagina({ erroSlug: 'nao-existe' })

    await screen.findByRole('heading', { level: 1, name: 'Este erro não existe.' })
    expect(document.title).toBe('Erro não encontrado | Codex')
  })
})
