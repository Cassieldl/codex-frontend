import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../../test/mocks/server'
import type { VersaoProvedorResumo } from '../types/provedor'
import { ProvedorIndexConteudo } from './provedor-index'

const API_URL = import.meta.env.VITE_API_URL

const PROVEDOR_SLUG = 'prefeitura-exemplo'

// JSON literal transcrito de VersaoProvedorPaginaDto, sem o tipo do cliente.
function respostaDaVersao(versaoSlug: string) {
  return {
    data: {
      provedor: {
        slug: PROVEDOR_SLUG,
        nome: 'Prefeitura Exemplo',
        categoria: 'Nacional',
        identificadorInvoicy: 'prefeitura-exemplo',
      },
      versao: {
        slug: versaoSlug,
        rotulo: versaoSlug,
        verificadoEm: '2026-07-01T00:00:00Z',
        introducao: null,
        versaoLayoutRotulo: '9',
      },
      camposPorGrupo: [
        {
          grupo: 'Servico',
          grupoSlug: 'servico',
          campos: [
            {
              campoLayoutSlug: 'servico-discriminacao',
              nome: 'Discriminacao',
              caminhoXml: '//Servico/Discriminacao',
              significado: 'Descrição do serviço prestado.',
              tipo: 'Texto',
              tamanho: '1000',
              mascara: null,
              dominio: null,
              estadoPreenchimento: 'Obrigatorio',
              condicao: null,
              exemplo: null,
              notaPreenchimento: null,
              destinoXml: 'DPS/infDPS/serv/cServ/xDescServ',
              notaTransformacao: null,
              ordem: 1,
              errosConhecidos: [],
            },
          ],
        },
      ],
      totalCampos: 1,
      avisos: [],
      errosResumo: {
        total: 1,
        itens: [
          {
            slug: 'e1235-falha-no-esquema',
            codigo: 'E1235',
            titulo: 'Falha no esquema XML da DPS',
            variantes: [],
          },
        ],
      },
      exemplos: [
        {
          slug: 'sem-tomador',
          nome: 'Emissão sem tomador',
          descricao: null,
          xml: '<Rps/>',
        },
      ],
      outrasVersoes: [],
      naturezasOperacao: [],
    },
    message: null,
  }
}

/** Registra cada versão pedida a P4, para provar qual delas a página abriu. */
function handlerVersoesRegistrandoPedidos() {
  const pedidas: string[] = []
  const handler = http.get(
    `${API_URL}/provedores/${PROVEDOR_SLUG}/versoes/:versaoSlug`,
    ({ params }) => {
      const versaoSlug = String(params.versaoSlug)
      pedidas.push(versaoSlug)
      return HttpResponse.json(respostaDaVersao(versaoSlug))
    },
  )

  return { handler, pedidas }
}

function renderComRouter(versoes: VersaoProvedorResumo[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaIndex = createRoute({
    getParentRoute: () => rootRoute,
    path: '/provedores/$provedorSlug/',
    component: () => (
      <ProvedorIndexConteudo
        provedorSlug={PROVEDOR_SLUG}
        provedorNome="Prefeitura Exemplo"
        versoes={versoes}
        avisosDoProvedor={[]}
        aba="campos"
      />
    ),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rotaIndex]),
    history: createMemoryHistory({ initialEntries: [`/provedores/${PROVEDOR_SLUG}/`] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function versao(slug: string) {
  return {
    slug,
    rotulo: `Versão ${slug}`,
    verificadoEm: '2026-07-01T00:00:00Z',
    url: `/provedores/${PROVEDOR_SLUG}`,
  }
}

beforeEach(() => {
  // O jsdom não implementa `scrollIntoView`; a tabela de campos o chama.
  Element.prototype.scrollIntoView = vi.fn()
})

describe('ProvedorIndexConteudo (rota /provedores/{slug})', () => {
  it('mostra o conteúdo da aba direto, sem escolha de versão', async () => {
    const { handler } = handlerVersoesRegistrandoPedidos()
    server.use(handler)

    renderComRouter([versao('v1')])

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Campos e mapeamento' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Escolha uma versão/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Versão v1/ })).not.toBeInTheDocument()
  })

  it('abre a primeira versão que P3 entregou, a mais nova', async () => {
    const { handler, pedidas } = handlerVersoesRegistrandoPedidos()
    server.use(handler)

    renderComRouter([versao('v2'), versao('v1')])

    await screen.findByRole('heading', { level: 2, name: 'Campos e mapeamento' })
    expect(pedidas).toEqual(['v2'])
  })

  it('nomeia a aba com o provedor, sem a versão', async () => {
    const { handler } = handlerVersoesRegistrandoPedidos()
    server.use(handler)

    renderComRouter([versao('v1')])

    await screen.findByRole('heading', { level: 2, name: 'Campos e mapeamento' })
    expect(document.title).toBe('Prefeitura Exemplo | Codex')
  })
})

describe('ProvedorIndexConteudo: provedor sem versão publicada', () => {
  it('mostra o estado vazio e não consulta versão nenhuma', async () => {
    const { handler, pedidas } = handlerVersoesRegistrandoPedidos()
    server.use(handler)

    renderComRouter([])

    expect(
      await screen.findByText('O conteúdo deste provedor estará disponível em breve.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todos os provedores' })).toBeInTheDocument()
    expect(pedidas).toHaveLength(0)
    expect(document.title).toBe('Prefeitura Exemplo | Codex')
  })
})
