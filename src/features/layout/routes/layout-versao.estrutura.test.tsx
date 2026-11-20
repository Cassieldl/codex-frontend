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
import type { JSX } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { layoutVersaoSearchSchema } from '../../../routes/layout/$versaoSlug'
import {
  handlerCampoLayoutVerbeteSucesso,
  handlerLayoutIndiceSucesso,
  handlerLayoutVersaoSucesso,
} from '../../../test/mocks/handlers'
import { server } from '../../../test/mocks/server'
import { LayoutVersaoPage } from './layout-versao'

const API_URL = import.meta.env.VITE_API_URL

function campo(slug: string, nome: string, ordem: number) {
  return {
    slug,
    nome,
    caminhoXml: `Envio/RPS/${nome}`,
    significado: `Significado de ${nome}.`,
    ordem,
    novoNestaVersao: false,
    descontinuadoNestaVersao: false,
    urlCanonica: `/layout/campos/${slug}`,
  }
}

const paginaFake = {
  versao: { slug: '8', rotulo: '8', estado: 'Vigente', ordem: 1, totalCampos: 2 },
  descricao: null,
  anterior: null,
  totalCampos: 2,
  camposPorGrupo: [
    {
      grupo: 'RPS',
      grupoSlug: 'rps',
      campos: [
        campo('numero-do-rps', 'Número do RPS', 1),
        campo('valor-do-servico', 'Valor do serviço', 2),
      ],
    },
  ],
}

// JSON literal do contrato: `Numero` fica num grupo de 3º nível, que nasce recolhido. Os Dest*
// são alternativas de um xs:choice (`escolha`) e existem nos dois formatos.
function no(nome: string, extras: object = {}) {
  return {
    nome,
    caminho: nome,
    ehGrupo: false,
    repete: false,
    escolha: false,
    valorModelo: null,
    campoSlug: null,
    formato: 'ambos',
    filhos: [],
    ...extras,
  }
}

const estruturaFake = {
  versao: paginaFake.versao,
  xml: no('Envio', {
    ehGrupo: true,
    filhos: [
      no('RPS', {
        ehGrupo: true,
        repete: true,
        filhos: [
          no('Identificacao', {
            ehGrupo: true,
            filhos: [no('Numero', { valorModelo: '0', campoSlug: 'numero-do-rps' })],
          }),
          no('ValorServicos', { valorModelo: '0.00', campoSlug: 'valor-do-servico' }),
          no('CodigoSoap', { valorModelo: 'texto(5)', formato: 'soXml' }),
          no('DestCPF', { valorModelo: 'XX', escolha: true }),
          no('DestCNPJ', { valorModelo: 'XX', escolha: true }),
          no('DataEmissao', { valorModelo: '2026-12-31' }),
        ],
      }),
    ],
  }),
  json: no('Documento', {
    ehGrupo: true,
    filhos: [
      no('ValorServicos', { valorModelo: '0.00', campoSlug: 'valor-do-servico' }),
      no('DestCPF', { valorModelo: 'XX', escolha: true }),
      no('DestCNPJ', { valorModelo: 'XX', escolha: true }),
    ],
  }),
}

function handlerDaEstrutura(aoBuscar: () => void, status = 200) {
  return http.get(`${API_URL}/layout/versoes/8/estrutura`, () => {
    aoBuscar()
    if (status !== 200) {
      return HttpResponse.json(
        { error: { code: 'ESTRUTURA_INDISPONIVEL', message: 'Sem estrutura.' } },
        { status },
      )
    }
    return HttpResponse.json({ data: estruturaFake, message: null })
  })
}

function renderPagina(urlInicial: string) {
  const rootRoute = createRootRoute({ component: Outlet })

  // O mesmo fio da rota real: a aba vem do search validado e a troca navega com `replace`.
  function PaginaComBusca(): JSX.Element {
    const { visao } = rota.useSearch()
    const navigate = rota.useNavigate()
    return (
      <LayoutVersaoPage
        versaoSlug="8"
        visao={visao}
        aoMudarVisao={(novaVisao) => {
          void navigate({
            search: (anterior) => ({ ...anterior, visao: novaVisao }),
            replace: true,
          })
        }}
      />
    )
  }

  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/layout/$versaoSlug',
    validateSearch: layoutVersaoSearchSchema,
    component: PaginaComBusca,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: [urlInicial] }),
  })

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return router
}

let rolagem: Mock<Element['scrollIntoView']>
let buscasDaEstrutura: number

beforeEach(() => {
  rolagem = vi.fn<Element['scrollIntoView']>()
  Element.prototype.scrollIntoView = rolagem
  buscasDaEstrutura = 0
  server.use(
    handlerLayoutIndiceSucesso(),
    handlerLayoutVersaoSucesso('8', paginaFake),
    handlerCampoLayoutVerbeteSucesso('numero-do-rps'),
    handlerCampoLayoutVerbeteSucesso('valor-do-servico'),
    handlerDaEstrutura(() => {
      buscasDaEstrutura += 1
    }),
  )
})

describe('LayoutVersaoPage: estrutura XML e JSON', () => {
  it('a aba Dicionário não busca a estrutura; abrir XML busca e grava a aba na URL', async () => {
    const usuario = userEvent.setup()
    const router = renderPagina('/layout/8')

    const visaoDicionario = await screen.findByRole('radio', { name: 'Dicionário' })
    expect(visaoDicionario).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: 'Número do RPS' })).toBeInTheDocument()
    expect(buscasDaEstrutura).toBe(0)

    await usuario.click(screen.getByRole('radio', { name: 'XML (SOAP)' }))

    expect(
      await screen.findByRole('region', { name: 'Texto da estrutura XML (SOAP)' }),
    ).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ visao: 'xml' })
    expect(buscasDaEstrutura).toBe(1)

    // Seta para a direita leva à aba JSON, que reaproveita a resposta em cache.
    screen.getByRole('radio', { name: 'XML (SOAP)' }).focus()
    await usuario.keyboard('{ArrowRight}')
    expect(
      await screen.findByRole('region', { name: 'Texto da estrutura JSON (REST)' }),
    ).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ visao: 'json' })
    expect(buscasDaEstrutura).toBe(1)
  })

  it('a tag com campo é botão que abre o verbete daquele campo', async () => {
    const usuario = userEvent.setup()
    renderPagina('/layout/8?visao=xml')

    const regiao = await screen.findByRole('region', { name: 'Texto da estrutura XML (SOAP)' })
    // Tag sem campo continua texto; a de só SOAP traz o marcador com explicação.
    expect(within(regiao).queryByRole('button', { name: 'CodigoSoap' })).not.toBeInTheDocument()
    expect(within(regiao).getByText(/esta tag existe só no envio XML/)).toBeInTheDocument()
    // Aqui o destino é o verbete, nunca o link para a tabela da página do provedor.
    expect(within(regiao).queryByRole('link')).not.toBeInTheDocument()

    await usuario.click(within(regiao).getByRole('button', { name: 'ValorServicos' }))

    expect(await screen.findByRole('dialog', { name: 'Valor do serviço' })).toBeInTheDocument()
  })

  it('marca as alternativas de um xs:choice, com explicação acessível, também no JSON', async () => {
    renderPagina('/layout/8?visao=json')

    const regiao = await screen.findByRole('region', { name: 'Texto da estrutura JSON (REST)' })
    const marcadas = within(regiao).getAllByText(/informe só uma das tags irmãs/)
    expect(marcadas.map((marca) => marca.closest('[data-linha]')?.textContent)).toEqual([
      expect.stringContaining('"DestCPF": "XX"'),
      expect.stringContaining('"DestCNPJ": "XX"'),
    ])
    expect(
      within(regiao)
        .getByText(/ValorServicos/)
        .closest('[data-linha]'),
    ).not.toHaveTextContent('uma entre as opções')
  })

  it('marca na linha, com texto, o campo novo e o da reforma, cruzados pelo dicionário', async () => {
    const usuario = userEvent.setup()
    const [numero, valor] = paginaFake.camposPorGrupo[0].campos
    server.use(
      handlerLayoutVersaoSucesso('8', {
        ...paginaFake,
        camposPorGrupo: [
          {
            ...paginaFake.camposPorGrupo[0],
            campos: [
              { ...numero, reformaTributaria: true },
              { ...valor, novoNestaVersao: true },
            ],
          },
        ],
      }),
    )
    renderPagina('/layout/8?visao=xml')

    const regiao = await screen.findByRole('region', { name: 'Texto da estrutura XML (SOAP)' })
    await usuario.click(screen.getByRole('button', { name: 'Expandir tudo' }))
    const linhaDe = (nome: string) =>
      within(regiao).getByRole('button', { name: nome }).closest('[data-linha]')

    expect(linhaDe('ValorServicos')).toHaveTextContent('novo na versão 8')
    expect(linhaDe('ValorServicos')).not.toHaveTextContent('reforma tributária')
    expect(linhaDe('Numero')).toHaveTextContent('Campo da reforma tributária (IBS/CBS)')
    expect(linhaDe('Numero')).not.toHaveTextContent('novo na')

    const legenda = screen.getByRole('list', { name: 'Legenda:' })
    expect(within(legenda).getByText('campo novo nesta versão')).toBeInTheDocument()
    expect(within(legenda).getByText('campo da reforma tributária (IBS/CBS)')).toBeInTheDocument()
  })

  it('o link da âncora abre o grupo recolhido, rola até a linha e a destaca', async () => {
    renderPagina('/layout/8?visao=xml#estrutura-numero-do-rps')

    const regiao = await screen.findByRole('region', { name: 'Texto da estrutura XML (SOAP)' })
    const botao = await within(regiao).findByRole('button', { name: 'Numero' })
    const linha = botao.closest('[data-linha]')

    expect(linha).toHaveAttribute('id', 'estrutura-numero-do-rps')
    expect(linha).toHaveClass('bg-highlight-anchor')
    expect(within(regiao).getByRole('button', { name: 'Recolher Identificacao' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    await waitFor(() => expect(rolagem.mock.contexts).toContain(linha))
    expect(botao).toHaveFocus()
  })

  it('a mesma âncora numa entrada nova do histórico rola de novo, sem remontar a estrutura', async () => {
    const router = renderPagina('/layout/8?visao=xml#estrutura-numero-do-rps')
    const regiao = await screen.findByRole('region', { name: 'Texto da estrutura XML (SOAP)' })
    const linha = (await within(regiao).findByRole('button', { name: 'Numero' })).closest(
      '[data-linha]',
    )
    await waitFor(() => expect(rolagem.mock.contexts).toContain(linha))
    rolagem.mockClear()

    // Outro search com o mesmo hash: entrada nova, mesmo slug e mesma aba montada.
    await router.navigate({
      to: '/layout/$versaoSlug',
      params: { versaoSlug: '8' },
      search: { visao: 'xml', origem: 'teste' },
      hash: 'estrutura-numero-do-rps',
      hashScrollIntoView: false,
    })

    const centralizouALinha = () =>
      rolagem.mock.calls.some(
        ([opcoes], indice) =>
          rolagem.mock.contexts[indice] === linha &&
          typeof opcoes === 'object' &&
          opcoes.block === 'center',
      )
    await waitFor(() => expect(centralizouALinha()).toBe(true))
  })

  it('o verbete aponta só para os formatos em que a tag existe, quando a estrutura é conhecida', async () => {
    const usuario = userEvent.setup()
    renderPagina('/layout/8?visao=xml')
    await screen.findByRole('region', { name: 'Texto da estrutura XML (SOAP)' })

    await usuario.click(screen.getByRole('radio', { name: 'Dicionário' }))
    await usuario.click(await screen.findByRole('button', { name: 'Número do RPS' }))

    const modal = await screen.findByRole('dialog', { name: 'Número do RPS' })
    expect(within(modal).getByRole('link', { name: 'Ver na estrutura (XML)' })).toHaveAttribute(
      'href',
      '/layout/8?visao=xml#estrutura-numero-do-rps',
    )
    expect(
      within(modal).queryByRole('link', { name: 'Ver na estrutura (JSON)' }),
    ).not.toBeInTheDocument()
  })

  it('404 da estrutura avisa no painel sem derrubar o dicionário', async () => {
    const usuario = userEvent.setup()
    server.use(handlerDaEstrutura(() => {}, 404))
    renderPagina('/layout/8?visao=json')

    expect(
      await screen.findByText(
        'A estrutura JSON (REST) desta versão estará disponível em breve. Consulte os campos na visão Dicionário.',
      ),
    ).toBeInTheDocument()

    await usuario.click(screen.getByRole('radio', { name: 'Dicionário' }))
    expect(await screen.findByRole('button', { name: 'Número do RPS' })).toBeInTheDocument()
    // Sem estrutura, o atalho só levaria ao aviso: nem a linha nem o modal o oferecem.
    expect(screen.queryAllByRole('link', { name: /na estrutura/ })).toHaveLength(0)
    await usuario.click(screen.getByRole('button', { name: 'Número do RPS' }))
    const modal = await screen.findByRole('dialog', { name: 'Número do RPS' })
    expect(within(modal).queryAllByRole('link', { name: /na estrutura/ })).toHaveLength(0)
  })
})
