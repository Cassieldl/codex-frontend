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
import { delay, http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import {
  construirCamposLayout,
  construirGrupoCamposLayout,
  handlerCampoLayoutVerbeteSucesso,
  handlerLayoutIndiceSucesso,
  handlerLayoutVersaoCapExcedido,
  handlerLayoutVersaoDespublicada,
  handlerLayoutVersaoSucesso,
} from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import { LINK_PLANILHA_DO_LAYOUT } from '../utils/planilhaDoLayout'
import { LayoutVersaoPage } from './layout-versao'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de LayoutIndiceDto, sem o tipo do cliente.
const indiceFake = {
  vigente: { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 2 },
  versoes: [
    { slug: '4-13', rotulo: '4.13', estado: 'Prevista', ordem: 3, totalCampos: 3 },
    { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 2 },
    { slug: '4-10', rotulo: '4.10', estado: 'Anterior', ordem: 1, totalCampos: 1 },
  ],
}

const paginaFake = {
  versao: {
    slug: '4-12',
    rotulo: '4.12',
    estado: 'Vigente',
    ordem: 2,
    totalCampos: 2,
  },
  descricao: 'Ajustes de retenção e de responsável pelo ISS.',
  anterior: { slug: '4-10', rotulo: '4.10', estado: 'Anterior', ordem: 1, totalCampos: 1 },
  totalCampos: 2,
  camposPorGrupo: [
    {
      grupo: 'Identificação',
      grupoSlug: 'identificacao',
      campos: [
        {
          slug: 'numero-do-rps',
          nome: 'Número do RPS',
          caminhoXml: 'Nfse/Rps/IdentificacaoRps/Numero',
          significado: 'Numeração sequencial do recibo.',
          ordem: 1,
          novoNestaVersao: false,
          descontinuadoNestaVersao: false,
          urlCanonica: '/layout/campos/numero-do-rps',
        },
      ],
    },
    {
      grupo: 'Valores',
      grupoSlug: 'valores',
      campos: [
        {
          slug: 'valor-do-servico',
          nome: 'Valor do serviço',
          caminhoXml: 'Nfse/Servico/Valores/ValorServicos',
          significado: 'Preço total cobrado pela prestação.',
          ordem: 2,
          novoNestaVersao: true,
          descontinuadoNestaVersao: false,
          urlCanonica: '/layout/campos/valor-do-servico',
        },
      ],
    },
  ],
}

function trilhaDaPagina(): string {
  const principal = screen.getByRole('main')
  const trilha = within(principal).getAllByRole('link', { name: 'Layout InvoiCy' })[0].closest('p')
  return (trilha?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function renderPagina(
  versaoSlug = '4-12',
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/layout/$versaoSlug',
    component: () => (
      <LayoutVersaoPage versaoSlug={versaoSlug} visao="dicionario" aoMudarVisao={() => {}} />
    ),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: [`/layout/${versaoSlug}`] }),
  })

  const resultado = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...resultado, router }
}

let rolagem: Mock<Element['scrollIntoView']>

beforeEach(() => {
  // jsdom não implementa rolagem, sem o duplo, a âncora derrubaria a página.
  rolagem = vi.fn<Element['scrollIntoView']>()
  Element.prototype.scrollIntoView = rolagem
})

afterEach(() => {
  window.location.hash = ''
})

describe('LayoutVersaoPage', () => {
  it('monta o dicionário da versão pedida', async () => {
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
    )
    renderPagina()

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Layout InvoiCy versão 4.12',
    )
    // Um bloco por vez: o primeiro aparece, o do outro bloco espera a lateral.
    const dicionario = within(screen.getByRole('region', { name: 'Dicionário de campos' }))
    expect(dicionario.getByText('Número do RPS')).toBeInTheDocument()
    expect(dicionario.queryByText('Valor do serviço')).not.toBeInTheDocument()
    expect(screen.getByText('2 campos')).toBeInTheDocument()
    // O "O que mudou" mora no hub: aqui o recorte "Só o que mudou" cobre.
    expect(screen.queryByRole('heading', { name: /O que mudou/ })).not.toBeInTheDocument()
  })

  it('o cabeçalho oferece a planilha do layout, avisando que abre em nova aba', async () => {
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
    )
    renderPagina()

    const planilha = await screen.findByRole('link', {
      name: 'Baixar planilha .xlsx · GitHub (abre em nova aba)',
    })
    expect(planilha).toHaveAttribute('href', LINK_PLANILHA_DO_LAYOUT)
    expect(planilha).toHaveAttribute('target', '_blank')
    expect(planilha).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('com versão anterior, "Só o que mudou" deixa no dicionário só os campos novos', async () => {
    const usuario = userEvent.setup()
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
    )
    renderPagina()

    const soOQueMudou = await screen.findByRole('radio', { name: 'Só o que mudou' })
    await usuario.click(soOQueMudou)

    const dicionario = within(screen.getByRole('region', { name: 'Dicionário de campos' }))
    expect(soOQueMudou).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Layout completo' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(dicionario.getByText('Valor do serviço')).toBeInTheDocument()
    expect(dicionario.queryByText('Número do RPS')).not.toBeInTheDocument()
  })

  it('a primeira versão, sem anterior, não tem o alternador do que mudou', async () => {
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', { ...paginaFake, anterior: null }),
    )
    renderPagina()

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: 'O que mostrar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Só o que mudou' })).not.toBeInTheDocument()
  })

  it('mostra a origem e os prazos da versão, com hoje entre os marcos', async () => {
    const paginaComMarcos = {
      ...paginaFake,
      versao: {
        ...paginaFake.versao,
        normaOrigem: 'NT 009 v1.01',
        homologacaoDesde: '2000-10-01',
        liberadaNoInvoicyEm: '2000-10-22',
        obrigatoriaEm: '2999-12-01',
      },
    }
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaComMarcos),
    )
    renderPagina()

    const marcos = await screen.findByRole('region', { name: 'Origem e prazos da versão 4.12' })
    // A origem fica na linha de fatos do cabeçalho; a faixa destaca o prazo e a contagem.
    expect(document.querySelector('[data-fatos-da-versao]')).toHaveTextContent(
      'origem NT 009 v1.01 · 2 campos',
    )
    expect(within(marcos).queryByText('NT 009 v1.01')).not.toBeInTheDocument()
    expect(
      within(marcos).getByText('Obrigatória em produção', { selector: 'p' }),
    ).toBeInTheDocument()
    expect(within(marcos).getByText(/^Faltam \d+ dias$/)).toBeInTheDocument()
    const prazos = within(marcos).getByRole('list', { name: 'Prazos da versão 4.12' })
    const entradas = within(prazos)
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(entradas).toEqual([
      'Homologaçãoout/2000',
      'Liberada no InvoiCy22/10/2000',
      expect.stringMatching(/^Hoje/),
      'Obrigatória em produção01/12/2999',
    ])
  })

  it('com o prazo já vencido, diz "desde" e não conta dias', async () => {
    const paginaVencida = {
      ...paginaFake,
      versao: { ...paginaFake.versao, obrigatoriaEm: '2000-12-01' },
    }
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaVencida),
    )
    renderPagina()

    const marcos = await screen.findByRole('region', { name: 'Origem e prazos da versão 4.12' })
    expect(within(marcos).getByText('Obrigatória em produção desde')).toBeInTheDocument()
    expect(marcos.querySelector('[data-dias-restantes]')).toBeNull()
  })

  it('sem origem nem datas, o bloco de prazos não aparece', async () => {
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
    )
    renderPagina()

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('region', { name: /Origem e prazos/ })).not.toBeInTheDocument()
  })

  it('escreve "versão" uma vez só: trilha, título e lista de versões', async () => {
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
    )
    renderPagina()

    await screen.findByRole('heading', { level: 1 })

    const principal = within(screen.getByRole('main'))
    expect(principal.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Layout InvoiCy versão 4.12',
    )
    expect(principal.getByRole('option', { name: 'Versão 4.10 · anterior' })).toBeInTheDocument()
    expect(trilhaDaPagina()).toBe('Layout InvoiCy / Versão 4.12')
  })

  it('o rótulo que já chega com "Versão" não gera "versão Versão" em lugar nenhum da tela', async () => {
    const paginaComRotuloCompleto = {
      ...paginaFake,
      versao: { ...paginaFake.versao, rotulo: 'Versão 4.12' },
      anterior: { ...paginaFake.anterior, rotulo: 'Versão 4.10' },
    }
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaComRotuloCompleto),
    )
    renderPagina()

    await screen.findByRole('heading', { level: 1 })

    const principal = within(screen.getByRole('main'))
    expect(principal.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Layout InvoiCy versão 4.12',
    )
    expect(principal.getByRole('option', { name: 'Versão 4.10 · anterior' })).toBeInTheDocument()
    expect(trilhaDaPagina()).toBe('Layout InvoiCy / Versão 4.12')
    expect(screen.getByRole('main').textContent).not.toMatch(/vers[aã]o\s+vers[aã]o/i)
  })

  it('a versão se escolhe só na lista suspensa, com a aberta marcada, e trocar leva à rota dela', async () => {
    const usuario = userEvent.setup()
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
    )
    const { router } = renderPagina('4-12')

    const seletor = await screen.findByRole('combobox', { name: 'Versão' })
    expect(seletor).toHaveValue('4-12')
    expect(
      within(seletor)
        .getAllByRole('option')
        .map((opcao) => opcao.textContent),
    ).toEqual(['Versão 4.13 · prevista', 'Versão 4.12 · vigente', 'Versão 4.10 · anterior'])
    expect(screen.getByText('Vigente', { selector: 'span' })).toBeInTheDocument()
    // Sem cartões, histórico nem link solto para outra versão.
    expect(screen.queryByRole('region', { name: 'Histórico de versões' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /dicionário da versão/i })).not.toBeInTheDocument()

    await usuario.selectOptions(seletor, '4-10')

    expect(router.state.location.pathname).toBe('/layout/4-10')
  })

  it('trocar de versão na lista mantém a página e o foco na lista até a nova versão chegar', async () => {
    const usuario = userEvent.setup()
    const paginaAnterior = {
      ...paginaFake,
      versao: { ...paginaFake.anterior, normaOrigem: null },
      anterior: null,
    }
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
      http.get(`${API_URL}/layout/versoes/4-10`, async () => {
        await delay(50)
        return HttpResponse.json({ data: paginaAnterior, message: null })
      }),
    )

    const rootRoute = createRootRoute({ component: Outlet })
    const rota = createRoute({
      getParentRoute: () => rootRoute,
      path: '/layout/$versaoSlug',
      component: function PaginaPeloParametro() {
        const { versaoSlug } = rota.useParams()
        return (
          <LayoutVersaoPage versaoSlug={versaoSlug} visao="dicionario" aoMudarVisao={() => {}} />
        )
      },
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([rota]),
      history: createMemoryHistory({ initialEntries: ['/layout/4-12'] }),
    })
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    const seletor = await screen.findByRole('combobox', { name: 'Versão' })
    await usuario.selectOptions(seletor, '4-10')

    // Enquanto a 4.10 carrega, a 4.12 continua na tela e a lista segue com o foco.
    expect(screen.queryByText('Carregando o dicionário de campos…')).not.toBeInTheDocument()
    expect(seletor).toHaveFocus()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Layout InvoiCy versão 4.10' }),
    ).toBeInTheDocument()
    expect(seletor).toBeInTheDocument()
    expect(seletor).toHaveFocus()
    expect(seletor).toHaveValue('4-10')
  })

  it('a âncora #campo-{slug} abre o bloco, rola até a linha, abre o modal e marca só essa linha', async () => {
    window.location.hash = '#campo-valor-do-servico'
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
      handlerCampoLayoutVerbeteSucesso('valor-do-servico'),
    )
    renderPagina()

    expect(await screen.findByRole('dialog', { name: 'Valor do serviço' })).toBeInTheDocument()

    const linha = document.getElementById('campo-valor-do-servico')
    expect(linha).not.toBeNull()
    // O link profundo abre o bloco do campo, mesmo não sendo o primeiro.
    expect(document.getElementById('bloco-Valores')).not.toBeNull()
    expect(document.getElementById('campo-numero-do-rps')).toBeNull()
    expect(linha?.className).toContain('bg-highlight-anchor')
    expect(rolagem).toHaveBeenCalledWith({ block: 'center' })
    expect(document.querySelectorAll('[aria-current="true"]')).toHaveLength(1)
  })

  it('422 mostra a tela nomeada do limite, nunca o "tentar novamente" genérico', async () => {
    server.use(handlerLayoutIndiceSucesso(indiceFake), handlerLayoutVersaoCapExcedido('4-12'))
    renderPagina()

    expect(await screen.findByText('Não foi possível exibir esta versão.')).toBeInTheDocument()
    expect(screen.getByText('Fale com o suporte para consultar esta versão.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('410 diz que a versão saiu do ar, com saída para as versões publicadas', async () => {
    server.use(handlerLayoutIndiceSucesso(indiceFake), handlerLayoutVersaoDespublicada('4-12'))
    renderPagina()

    expect(await screen.findByText('Esta versão saiu do ar.')).toBeInTheDocument()
    expect(
      screen.getByText('Escolha uma das versões publicadas do Layout InvoiCy.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('404 diz que a versão não existe, desfecho distinto do 410', async () => {
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      http.get(`${API_URL}/layout/versoes/4-12`, () =>
        HttpResponse.json(
          { error: { code: 'VERSAO_LAYOUT_NAO_ENCONTRADA', message: 'Não encontrada.' } },
          { status: 404 },
        ),
      ),
    )
    renderPagina()

    expect(await screen.findByText('Esta versão do Layout InvoiCy não existe.')).toBeInTheDocument()
    expect(screen.queryByText('Esta versão saiu do ar.')).not.toBeInTheDocument()
  })

  // O QueryClient aqui retenta, como o de produção: um 404 retentado prendia /layout/99 no
  // skeleton por segundos, sem h1 nenhum.
  it('/layout/99 inexistente mostra logo exatamente um h1, sem esperar retentativa', async () => {
    let requisicoesDaVersao = 0
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      http.get(`${API_URL}/layout/versoes/99`, () => {
        requisicoesDaVersao += 1
        return HttpResponse.json(
          { error: { code: 'VERSAO_LAYOUT_NAO_ENCONTRADA', message: 'Não encontrada.' } },
          { status: 404 },
        )
      }),
    )
    // Sem espera entre tentativas, uma retentativa aparece na contagem em vez de só atrasar o h1.
    renderPagina('99', new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } }))

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo).toHaveTextContent('Esta versão do Layout InvoiCy não existe.')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(requisicoesDaVersao).toBe(1)
  })

  it('erro sem desfecho nomeado cai no estado de erro genérico, nunca em tela vazia', async () => {
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      http.get(`${API_URL}/layout/versoes/4-12`, () => HttpResponse.json({}, { status: 500 })),
    )
    renderPagina()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('falha do índice de versões não derruba o dicionário', async () => {
    server.use(
      http.get(`${API_URL}/layout`, () => HttpResponse.json({}, { status: 500 })),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
    )
    renderPagina()

    expect(await screen.findByText('Número do RPS')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Versão' })).not.toBeInTheDocument()
  })

  it('versão densa: o índice lateral lista cada bloco com a própria contagem', async () => {
    const paginaDensa = {
      ...paginaFake,
      totalCampos: 45,
      camposPorGrupo: [
        construirGrupoCamposLayout(
          'Identificação',
          'identificacao',
          construirCamposLayout(10, 'id'),
        ),
        construirGrupoCamposLayout('Prestador', 'prestador', construirCamposLayout(15, 'prest')),
        construirGrupoCamposLayout('Valores', 'valores', construirCamposLayout(20, 'val')),
      ],
    }
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaDensa),
    )
    renderPagina()

    await screen.findByRole('heading', { level: 1 })

    const indice = within(screen.getByRole('navigation', { name: 'Blocos do layout' }))
    // Ordem de chegada dos blocos, com contagens distintas: uma reordenação ou uma contagem global
    // no lugar da contagem por bloco cai aqui. O texto lido inclui o complemento só para leitor de tela.
    expect(
      indice.getAllByRole('link').map((link) => link.textContent?.replace(/\s+/g, ' ').trim()),
    ).toEqual(['Identificação 10 campos', 'Prestador 15 campos', 'Valores 20 campos'])
  })

  it('anuncia o carregamento do dicionário', async () => {
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      http.get(`${API_URL}/layout/versoes/4-12`, async () => {
        await delay(80)
        return HttpResponse.json({ data: paginaFake, message: null })
      }),
    )
    renderPagina()

    expect(await screen.findByText('Carregando o dicionário de campos…')).toBeInTheDocument()
    expect(await screen.findByText('Número do RPS')).toBeInTheDocument()
  })
})

describe('LayoutVersaoPage: título da aba', () => {
  it('nomeia a aba com a versão escrita por extenso', async () => {
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
    )
    renderPagina()

    await screen.findByRole('heading', { level: 1, name: 'Layout InvoiCy versão 4.12' })
    expect(document.title).toBe('Layout InvoiCy versão 4.12 | Codex')
  })

  it('versão inexistente nomeia a aba pelo desfecho', async () => {
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      http.get(`${API_URL}/layout/versoes/99`, () =>
        HttpResponse.json(
          { error: { code: 'VERSAO_LAYOUT_NAO_ENCONTRADA', message: 'Não encontrada.' } },
          { status: 404 },
        ),
      ),
    )
    renderPagina('99')

    await screen.findByRole('heading', { level: 1 })
    expect(document.title).toBe('Versão do Layout InvoiCy não encontrada | Codex')
  })
})
