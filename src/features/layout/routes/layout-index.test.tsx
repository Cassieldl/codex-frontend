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
import { describe, expect, it } from 'vitest'
import {
  handlerLayoutIndiceSucesso,
  handlerLayoutVersaoSucesso,
} from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import { LayoutIndicePage } from './layout-index'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de LayoutIndiceDto, sem o tipo do cliente.
const indiceCompleto = {
  vigente: { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 58 },
  versoes: [
    { slug: '4-13', rotulo: '4.13', estado: 'Prevista', ordem: 3, totalCampos: 62 },
    { slug: '4-12', rotulo: '4.12', estado: 'Vigente', ordem: 2, totalCampos: 58 },
    { slug: '4-10', rotulo: '4.10', estado: 'Anterior', ordem: 1, totalCampos: 55 },
  ],
}

function renderPagina() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/layout',
    component: LayoutIndicePage,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/layout'] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('LayoutIndicePage', () => {
  it('lista as versões publicadas na ordem do backend, com link para o dicionário de cada uma', async () => {
    server.use(handlerLayoutIndiceSucesso(indiceCompleto))
    renderPagina()

    const links = await screen.findAllByRole('link', { name: /Ver o dicionário da versão/ })
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Ver o dicionário da versão 4.13',
      'Ver o dicionário da versão 4.12',
      'Ver o dicionário da versão 4.10',
    ])
    expect(links[0]).toHaveAttribute('href', '/layout/4-13')
  })

  it('o estado de cada versão aparece por extenso, nunca só pela forma da borda', async () => {
    server.use(handlerLayoutIndiceSucesso(indiceCompleto))
    renderPagina()

    expect(await screen.findByText('Prevista')).toBeInTheDocument()
    expect(screen.getByText('Vigente')).toBeInTheDocument()
    expect(screen.getByText('Anterior')).toBeInTheDocument()
  })

  it('mostra o que a vigente mudou, com a nota em tópicos e a contagem de campos', async () => {
    server.use(
      handlerLayoutIndiceSucesso({
        ...indiceCompleto,
        novidades: {
          versao: indiceCompleto.vigente,
          anterior: indiceCompleto.versoes[2],
          descricao: 'InvoiCy 3.3.0.0.\nGrupos novos: Condominio\nSaíram: ValServEst',
          camposNovos: 44,
          camposDescontinuados: 20,
        },
      }),
    )
    renderPagina()

    const secao = await screen.findByRole('region', {
      name: 'O que mudou da versão 4.10 para a 4.12',
    })
    expect(secao).toHaveAttribute('id', 'novidades')
    expect(secao.querySelector('[data-contador="novos"]')).toHaveTextContent('44novos')
    expect(secao.querySelector('[data-contador="descontinuados"]')).toHaveTextContent('20saíram')
    expect(screen.getByText('InvoiCy 3.3.0.0.')).toBeInTheDocument()
    expect(screen.getByText('Grupos novos')).toBeInTheDocument()
    expect(screen.getByText('ValServEst')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir o dicionário da versão 4.12' })).toHaveAttribute(
      'href',
      '/layout/4-12',
    )
  })

  it('com mudanças estruturadas, agrupa em antes e depois, com contadores que batem com a lista', async () => {
    const vigente = {
      ...indiceCompleto.vigente,
      normaOrigem: 'NT 009 v1.01',
      mudancas: [
        { tipo: 'saiu', antes: 'ValServEst', depois: null, descricao: null },
        { tipo: 'renomeado', antes: 'nDI', depois: 'nroDUIMP', descricao: 'Número da DUIMP.' },
        { tipo: 'grupoNovo', antes: null, depois: 'Condominio', descricao: null },
        { tipo: 'mudouDeLugar', antes: 'tpOper/...', depois: 'RPSSubs/...', descricao: null },
      ],
    }
    server.use(
      handlerLayoutIndiceSucesso({
        ...indiceCompleto,
        vigente,
        novidades: {
          versao: vigente,
          anterior: indiceCompleto.versoes[2],
          descricao: 'InvoiCy 3.3.0.0.\nGrupos novos: Condominio',
          camposNovos: 44,
          camposDescontinuados: 20,
        },
      }),
      handlerLayoutVersaoSucesso('4-12', {
        camposPorGrupo: [
          {
            grupo: 'Valores',
            grupoSlug: 'valores',
            campos: [
              { slug: 'numero-duimp', nome: 'nroDUIMP', caminhoXml: '//Servico/Valores/nroDUIMP' },
            ],
          },
        ],
      }),
    )
    renderPagina()

    const secao = await screen.findByRole('region', {
      name: 'O que mudou da versão 4.10 para a 4.12',
    })
    // A origem fica só na linha do tempo, acima do card.
    expect(secao.querySelector('[data-origem-da-versao]')).toBeNull()
    expect(screen.getAllByText('NT 009 v1.01')).toHaveLength(1)
    expect(secao.querySelector('[data-contador="novos"]')).toHaveTextContent('1novo· 44 campos')
    expect(secao.querySelector('[data-contador="descontinuados"]')).toHaveTextContent(
      '1saiu· 20 campos',
    )
    expect(await within(secao).findByRole('link', { name: 'nroDUIMP' })).toHaveAttribute(
      'href',
      '/layout/campos/numero-duimp',
    )
    expect(secao.querySelector('[data-contador="mudaramDeLugar"]')).toHaveTextContent(
      '1mudou de lugar',
    )
    expect(secao.querySelector('[data-contador="renomeados"]')).toHaveTextContent('1renomeado')

    const grupos = [...secao.querySelectorAll('[data-grupo-de-mudancas]')]
    expect(grupos.map((grupo) => grupo.querySelector('h3')?.firstChild?.textContent)).toEqual([
      'Grupos novos',
      'Mudaram de lugar',
      'Renomeados',
      'Saíram',
    ])
    expect(secao.querySelector('[data-mudanca="renomeado"]')).toHaveTextContent(
      'nDI passou a ser nroDUIMPNúmero da DUIMP.',
    )
    // Os tópicos repetiriam a lista: da nota fica só o resumo.
    expect(within(secao).getByText('InvoiCy 3.3.0.0.')).toBeInTheDocument()
    expect(secao.querySelector('dl')).toBeNull()
  })

  it('sem versão anterior publicada, a seção não fala em mudança', async () => {
    server.use(
      handlerLayoutIndiceSucesso({
        ...indiceCompleto,
        novidades: {
          versao: indiceCompleto.vigente,
          anterior: null,
          descricao: 'Primeira versão do acervo.',
          camposNovos: 0,
          camposDescontinuados: 0,
        },
      }),
    )
    renderPagina()

    expect(await screen.findByRole('region', { name: 'Sobre a versão 4.12' })).toBeInTheDocument()
    expect(screen.queryByText(/O que mudou/)).not.toBeInTheDocument()
    expect(screen.queryByText(/campos? novos?/)).not.toBeInTheDocument()
  })

  it('mostra o estado vazio quando não há nenhuma versão publicada', async () => {
    server.use(handlerLayoutIndiceSucesso({ vigente: null, versoes: [] }))
    renderPagina()

    expect(
      await screen.findByText('O Layout InvoiCy ainda não tem nenhuma versão publicada.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('erro nunca é lido como vazio, mostra alerta com repetição, não o estado vazio', async () => {
    server.use(http.get(`${API_URL}/layout`, () => HttpResponse.json({}, { status: 500 })))
    renderPagina()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.queryByText('O Layout InvoiCy ainda não tem nenhuma versão publicada.'),
    ).not.toBeInTheDocument()
  })

  it('anuncia o carregamento enquanto a consulta não volta', async () => {
    server.use(
      http.get(`${API_URL}/layout`, async () => {
        await delay(80)
        return HttpResponse.json({ data: indiceCompleto, message: null })
      }),
    )
    renderPagina()

    expect(await screen.findByText('Carregando as versões do Layout InvoiCy…')).toBeInTheDocument()
    // E o carregamento some quando o conteúdo chega, nunca fica preso.
    expect(
      await screen.findByText('Versão do layout: escolha para ver o dicionário'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Carregando as versões do Layout InvoiCy…')).not.toBeInTheDocument()
  })

  it('diz em uma linha que tipo e obrigatoriedade ficam no provedor', async () => {
    server.use(handlerLayoutIndiceSucesso(indiceCompleto))
    renderPagina()

    expect(
      await screen.findByText(/Tipo e obrigatoriedade estão em cada provedor./),
    ).toBeInTheDocument()
  })

  it('mostra de qual norma a vigente veio e quando fica obrigatória', async () => {
    server.use(
      handlerLayoutIndiceSucesso({
        ...indiceCompleto,
        vigente: {
          ...indiceCompleto.vigente,
          normaOrigem: 'NT 009 v1.01',
          homologacaoDesde: null,
          liberadaNoInvoicyEm: null,
          obrigatoriaEm: '2026-12-01',
        },
      }),
    )
    renderPagina()

    const marcos = await screen.findByRole('region', { name: 'Origem e prazos da versão 4.12' })
    expect(within(marcos).getByText('NT 009 v1.01')).toBeInTheDocument()
    expect(within(marcos).getByText('Obrigatória em produção')).toBeInTheDocument()
    expect(within(marcos).getByText('01/12/2026')).toBeInTheDocument()
    // Marco sem data some sozinho.
    expect(within(marcos).queryByText('Homologação')).not.toBeInTheDocument()
    expect(within(marcos).queryByText('Liberada no InvoiCy')).not.toBeInTheDocument()
  })
})

describe('LayoutIndicePage: título da aba', () => {
  it('nomeia a aba "Layout InvoiCy | Codex"', async () => {
    server.use(handlerLayoutIndiceSucesso(indiceCompleto))
    renderPagina()

    await screen.findAllByRole('link', { name: /Ver o dicionário da versão/ })
    expect(document.title).toBe('Layout InvoiCy | Codex')
  })
})
