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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  construirCamposLayout,
  construirGrupoCamposLayout,
  handlerLayoutIndiceSucesso,
  handlerLayoutVersaoCapExcedido,
  handlerLayoutVersaoDespublicada,
  handlerLayoutVersaoSucesso,
} from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import type { LayoutIndice, LayoutVersaoPagina } from '../types/layoutPublico'
import { LayoutVersaoPage } from './layout-versao'

const API_URL = import.meta.env.VITE_API_URL

const indiceFake: LayoutIndice = {
  vigente: { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 2 },
  versoes: [
    { slug: '4-13', rotulo: '4.13', estado: 'Prevista', ordem: 3, totalCampos: 3 },
    { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 2 },
    { slug: '4-10', rotulo: '4.10', estado: 'Anterior', ordem: 1, totalCampos: 1 },
  ],
}

const paginaFake: LayoutVersaoPagina = {
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

function renderPagina(versaoSlug = '4-12') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/layout/$versaoSlug',
    component: () => <LayoutVersaoPage versaoSlug={versaoSlug} />,
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

beforeEach(() => {
  // jsdom não implementa rolagem — sem o duplo, a âncora derrubaria a página.
  Element.prototype.scrollIntoView = vi.fn()
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
      'Layout InvoiCy 4.12',
    )
    expect(screen.getByText('Número do RPS')).toBeInTheDocument()
    expect(screen.getByText('Valor do serviço')).toBeInTheDocument()
    expect(screen.getByText('Ajustes de retenção e de responsável pelo ISS.')).toBeInTheDocument()
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

  it('a âncora #campo-{slug} destaca a linha e rola até ela', async () => {
    window.location.hash = '#campo-valor-do-servico'
    server.use(
      handlerLayoutIndiceSucesso(indiceFake),
      handlerLayoutVersaoSucesso('4-12', paginaFake),
    )
    renderPagina()

    await screen.findByText('Valor do serviço')

    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled())
    const linha = document.getElementById('campo-valor-do-servico')
    expect(linha).not.toBeNull()
    expect(linha?.className).toContain('bg-highlight-anchor')
    // A linha não destacada nunca recebe o realce.
    expect(document.getElementById('campo-numero-do-rps')?.className).not.toContain(
      'bg-highlight-anchor',
    )
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

  it('versão densa: o índice lateral lista cada grupo com a própria contagem', async () => {
    const paginaDensa: LayoutVersaoPagina = {
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

    const indice = within(screen.getByRole('navigation', { name: 'Grupos de campo' }))
    // Ordem de chegada dos grupos, com contagens distintas: uma reordenação ou
    // uma contagem global no lugar da contagem por grupo cai aqui.
    // `textContent` cola nome e contagem (dois `<span>` adjacentes), daí o
    // formato sem espaço — o que importa é o par nome+contagem de cada item.
    expect(indice.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Identificação10',
      'Prestador15',
      'Valores20',
    ])
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
