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

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

let rolagem: Mock<Element['scrollIntoView']>

beforeEach(() => {
  // jsdom não implementa rolagem — sem o duplo, a âncora derrubaria a página.
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
    expect(screen.getByText('Número do RPS')).toBeInTheDocument()
    expect(screen.getByText('Valor do serviço')).toBeInTheDocument()
    expect(screen.getByText('Ajustes de retenção e de responsável pelo ISS.')).toBeInTheDocument()
  })

  it('escreve "versão" uma vez só: trilha, título, nota e link da versão anterior', async () => {
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
    expect(principal.getByRole('heading', { name: 'Nota da versão 4.12' })).toBeInTheDocument()
    expect(
      principal.getByRole('link', { name: 'ver o dicionário da versão 4.10' }),
    ).toHaveAttribute('href', '/layout/4-10')
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
    expect(principal.getByRole('heading', { name: 'Nota da versão 4.12' })).toBeInTheDocument()
    expect(
      principal.getByRole('link', { name: 'ver o dicionário da versão 4.10' }),
    ).toBeInTheDocument()
    expect(trilhaDaPagina()).toBe('Layout InvoiCy / Versão 4.12')
    expect(screen.getByRole('main').textContent).not.toMatch(/vers[aã]o\s+vers[aã]o/i)
  })

  it('marca como atual apenas a versão aberta — nunca duas ao mesmo tempo', async () => {
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
    )
    renderPagina('4-12')

    await screen.findByRole('heading', { level: 1 })

    const conteudo = within(screen.getByRole('main'))
    const atuais = conteudo
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')

    expect(atuais).toHaveLength(1)
    expect(atuais[0]).toHaveAttribute('aria-label', 'Ver o dicionário da versão 4.12')
  })

  it('o histórico mantém as outras versões acessíveis e não linka a que já está aberta', async () => {
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
    )
    renderPagina('4-12')

    const historico = within(await screen.findByRole('region', { name: 'Histórico de versões' }))
    expect(historico.getAllByRole('link', { name: 'Ver o dicionário' })).toHaveLength(2)
    expect(historico.getByText('Você está vendo esta versão')).toBeInTheDocument()
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
    expect(document.getElementById('bloco-Valores')).toHaveProperty('open', true)
    expect(linha?.className).toContain('bg-highlight-anchor')
    expect(rolagem).toHaveBeenCalledWith({ block: 'center' })
    // A linha não apontada nunca recebe o realce nem a marca de campo atual.
    expect(document.getElementById('campo-numero-do-rps')?.className).not.toContain(
      'bg-highlight-anchor',
    )
    expect(document.querySelectorAll('[aria-current="true"]')).toHaveLength(1)
  })

  it('422 mostra a tela nomeada do limite, nunca o "tentar novamente" genérico', async () => {
    server.use(handlerLayoutIndiceSucesso(indiceFake), handlerLayoutVersaoCapExcedido('4-12'))
    renderPagina()

    expect(
      await screen.findByText(
        'Esta versão tem mais campos do que esta página consegue exibir de uma vez.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('410 diz que a versão saiu do ar, com saída para as versões publicadas', async () => {
    server.use(handlerLayoutIndiceSucesso(indiceFake), handlerLayoutVersaoDespublicada('4-12'))
    renderPagina()

    expect(await screen.findByText('Esta versão saiu do ar.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('404 diz que a versão não existe — desfecho distinto do 410', async () => {
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
    expect(
      screen.queryByText('Versão do layout — escolha para ver o dicionário'),
    ).not.toBeInTheDocument()
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
