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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { keycloak } from '../../../../auth/keycloak'
import { server } from '../../../../test/mocks/server'
import { ProvedoresPage } from './provedores'
import { MENSAGEM_DE_CONFLITO } from '../../utils/mensagemDeErroDeEscrita'

const API_URL = import.meta.env.VITE_API_URL

const TODAS_AS_ROLES = [
  'provedores-buscar',
  'provedores-adicionar',
  'provedores-atualizar',
  'provedores-remover',
  'provedores-publicar',
]

// JSON transcrito de `ProvedorAdminListaItemDto`, sem anotação do tipo do cliente.
const PROVEDOR_RASCUNHO = {
  id: 11,
  slug: 'prefeitura-de-exemplo',
  nome: 'Prefeitura de Exemplo',
  categoria: 'Proprio',
  identificadorInvoicy: 'PREF-EXEMPLO',
  publicado: false,
  versaoConcorrencia: 5,
}

type ItemDaListaJson = typeof PROVEDOR_RASCUNHO

interface EscritaRecebida {
  metodo: string
  url: string
  ifMatch: string | null
  corpo: unknown
}

interface FalhaSimulada {
  status: number
  corpo: { error: { code: string; message: string } }
}

function paginaDeProvedores(itens: ItemDaListaJson[]) {
  return {
    items: itens,
    totalCount: itens.length,
    page: 1,
    pageSize: 25,
    totalPages: itens.length === 0 ? 0 : 1,
  }
}

/** JSON transcrito de `ProvedorAdminDetalheDto`, que é o `data` de criar e de publicar. */
function detalheDoProvedor(item: ItemDaListaJson, aliases: string[]) {
  return { ...item, aliases, avisos: [] }
}

function respostaSemIfMatch() {
  return HttpResponse.json(
    {
      error: {
        code: 'IF_MATCH_OBRIGATORIO',
        message: 'O header If-Match é obrigatório nesta operação.',
      },
    },
    { status: 400 },
  )
}

/** Estado do servidor de mentira: criar e publicar mexem na lista que o GET seguinte devolve. */
function criarServidorDeProvedores(
  itensIniciais: ItemDaListaJson[],
  falhaNaCriacao?: FalhaSimulada,
) {
  const itens = itensIniciais.map((item) => ({ ...item }))
  const escritas: EscritaRecebida[] = []

  server.use(
    http.get(`${API_URL}/interno/provedores`, () => HttpResponse.json(paginaDeProvedores(itens))),
    http.post(`${API_URL}/interno/provedores`, async ({ request }) => {
      const corpo = (await request.json()) as {
        nome: string
        identificadorInvoicy: string
        categoria: string
        aliases: string[]
      }
      escritas.push({
        metodo: 'POST',
        url: request.url,
        ifMatch: request.headers.get('If-Match'),
        corpo,
      })

      if (falhaNaCriacao) {
        return HttpResponse.json(falhaNaCriacao.corpo, { status: falhaNaCriacao.status })
      }

      const criado = {
        id: 12,
        slug: 'nota-carioca',
        nome: corpo.nome,
        categoria: corpo.categoria,
        identificadorInvoicy: corpo.identificadorInvoicy,
        publicado: false,
        versaoConcorrencia: 1,
      }
      itens.push(criado)
      return HttpResponse.json(
        { data: detalheDoProvedor(criado, corpo.aliases), message: 'Provedor criado com sucesso.' },
        { status: 201 },
      )
    }),
    http.put(`${API_URL}/interno/provedores/:id/publicacao`, async ({ request, params }) => {
      const corpo = (await request.json()) as { publicado: boolean }
      const ifMatch = request.headers.get('If-Match')
      escritas.push({ metodo: 'PUT', url: request.url, ifMatch, corpo })

      if (!ifMatch) return respostaSemIfMatch()

      const provedor = itens.find((item) => item.id === Number(params.id))
      if (!provedor) return new HttpResponse(null, { status: 404 })

      provedor.publicado = corpo.publicado
      provedor.versaoConcorrencia += 1
      return HttpResponse.json({ data: detalheDoProvedor(provedor, []), message: null })
    }),
  )

  return { escritas }
}

function autenticarCom(roles: string[]) {
  keycloak.tokenParsed = { resource_access: { 'codex-backend': { roles } } }
}

function renderizarPagina() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rotaRaiz = createRootRoute({ component: Outlet })
  const rotaLista = createRoute({
    getParentRoute: () => rotaRaiz,
    path: '/interno/provedores',
    component: ProvedoresPage,
  })
  const router = createRouter({
    routeTree: rotaRaiz.addChildren([rotaLista]),
    history: createMemoryHistory({ initialEntries: ['/interno/provedores'] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function linhaDoProvedor(nome: string): HTMLElement {
  return screen.getByRole('row', { name: new RegExp(nome) })
}

async function preencherNovoProvedor() {
  const usuario = userEvent.setup()
  await usuario.click(await screen.findByRole('button', { name: 'Novo provedor' }))
  await screen.findByRole('heading', { name: 'Novo provedor' })

  await usuario.type(screen.getByRole('textbox', { name: /Nome/ }), 'Nota Carioca')
  await usuario.type(screen.getByRole('textbox', { name: /Identificador InvoiCy/ }), 'RIO-NC')
  await usuario.type(screen.getByRole('textbox', { name: /Aliases/ }), 'NFS-e Rio{Enter}ISS Rio')
  await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
}

beforeEach(() => {
  autenticarCom(TODAS_AS_ROLES)
})

afterEach(() => {
  keycloak.tokenParsed = undefined
})

describe('ProvedoresPage: estados de carregamento', () => {
  it('anuncia o carregamento antes de a lista chegar', async () => {
    criarServidorDeProvedores([PROVEDOR_RASCUNHO])

    renderizarPagina()

    expect(await screen.findByText('Carregando provedores…')).toBeInTheDocument()
    expect(await screen.findByText('Prefeitura de Exemplo')).toBeInTheDocument()
  })

  it('falha na listagem oferece nova tentativa, e a nova tentativa traz a lista', async () => {
    const usuario = userEvent.setup()
    let tentativas = 0
    server.use(
      http.get(`${API_URL}/interno/provedores`, () => {
        tentativas += 1
        if (tentativas === 1) return new HttpResponse(null, { status: 500 })
        return HttpResponse.json(paginaDeProvedores([PROVEDOR_RASCUNHO]))
      }),
    )

    renderizarPagina()

    await usuario.click(await screen.findByRole('button', { name: /tentar novamente/i }))

    expect(await screen.findByText('Prefeitura de Exemplo')).toBeInTheDocument()
    expect(tentativas).toBe(2)
  })

  it('lista vazia mostra o estado vazio, nunca a tabela sem linhas', async () => {
    criarServidorDeProvedores([])

    renderizarPagina()

    expect(await screen.findByText('Nenhum provedor cadastrado ainda.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('ProvedoresPage: cada ação depende da própria role', () => {
  const BOTOES_POR_ACAO = {
    adicionar: /^novo provedor$/i,
    publicar: /^(publicar|despublicar)$/i,
  }

  it('só com provedores-buscar, nenhuma ação de escrita aparece', async () => {
    autenticarCom(['provedores-buscar'])
    criarServidorDeProvedores([PROVEDOR_RASCUNHO])

    renderizarPagina()

    await screen.findByText('Prefeitura de Exemplo')
    for (const nome of Object.values(BOTOES_POR_ACAO)) {
      expect(screen.queryByRole('button', { name: nome })).not.toBeInTheDocument()
    }
  })

  it.each([
    ['provedores-adicionar', 'adicionar'],
    ['provedores-publicar', 'publicar'],
  ] as const)('%s libera só o botão de %s', async (role, acaoLiberada) => {
    autenticarCom(['provedores-buscar', role])
    criarServidorDeProvedores([PROVEDOR_RASCUNHO])

    renderizarPagina()

    await screen.findByText('Prefeitura de Exemplo')
    for (const [acao, nome] of Object.entries(BOTOES_POR_ACAO)) {
      const botao = screen.queryByRole('button', { name: nome })
      if (acao === acaoLiberada) expect(botao).toBeInTheDocument()
      else expect(botao).not.toBeInTheDocument()
    }
  })
})

describe('ProvedoresPage: criação', () => {
  it('salvar envia POST sem If-Match com os campos do formulário, fecha o modal e a linha nova aparece', async () => {
    const { escritas } = criarServidorDeProvedores([PROVEDOR_RASCUNHO])

    renderizarPagina()
    await preencherNovoProvedor()

    expect(await screen.findByText('Nota Carioca')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Novo provedor' })).not.toBeInTheDocument()
    expect(within(linhaDoProvedor('Nota Carioca')).getByText('Rascunho')).toBeInTheDocument()
    expect(escritas).toEqual([
      {
        metodo: 'POST',
        url: `${API_URL}/interno/provedores`,
        ifMatch: null,
        corpo: {
          nome: 'Nota Carioca',
          identificadorInvoicy: 'RIO-NC',
          categoria: 'Nacional',
          aliases: ['NFS-e Rio', 'ISS Rio'],
        },
      },
    ])
  })

  it.each([
    [409, 'REGISTRO_DUPLICADO', 'Já existe um provedor com o identificador InvoiCy RIO-NC.'],
    [422, 'VALIDACAO_NEGOCIO', 'O identificador InvoiCy informado não é aceito.'],
  ])('%i na criação mostra a mensagem do servidor no modal', async (status, code, message) => {
    criarServidorDeProvedores([PROVEDOR_RASCUNHO], { status, corpo: { error: { code, message } } })

    renderizarPagina()
    await preencherNovoProvedor()

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('heading', { name: 'Novo provedor' })).toBeInTheDocument()
  })
})

describe('ProvedoresPage: publicação', () => {
  it('publicar envia PUT na rota de publicação com o If-Match do item, e a linha passa a publicada', async () => {
    const usuario = userEvent.setup()
    const { escritas } = criarServidorDeProvedores([PROVEDOR_RASCUNHO])

    renderizarPagina()

    await screen.findByText('Prefeitura de Exemplo')
    const linha = () => linhaDoProvedor('Prefeitura de Exemplo')
    expect(within(linha()).getByText('Rascunho')).toBeInTheDocument()

    await usuario.click(within(linha()).getByRole('button', { name: 'Publicar' }))

    expect(await within(linha()).findByRole('button', { name: 'Despublicar' })).toBeInTheDocument()
    expect(within(linha()).getByText('Publicado')).toBeInTheDocument()
    await waitFor(() =>
      expect(escritas).toEqual([
        {
          metodo: 'PUT',
          url: `${API_URL}/interno/provedores/11/publicacao`,
          ifMatch: 'W/"5"',
          corpo: { publicado: true },
        },
      ]),
    )
  })

  it.each([
    [
      409,
      'CONFLITO_CONCORRENCIA',
      'O provedor foi alterado por outra requisição. Recarregue e tente novamente.',
    ],
    [422, 'VALIDACAO_NEGOCIO', 'O provedor não pode ser publicado no estado atual.'],
  ])(
    '%i ao publicar mostra a mensagem do servidor na linha do provedor',
    async (status, code, message) => {
      const usuario = userEvent.setup()
      criarServidorDeProvedores([PROVEDOR_RASCUNHO])
      server.use(
        http.put(`${API_URL}/interno/provedores/:id/publicacao`, () =>
          HttpResponse.json({ error: { code, message } }, { status }),
        ),
      )

      renderizarPagina()

      await screen.findByText('Prefeitura de Exemplo')
      const linha = () => linhaDoProvedor('Prefeitura de Exemplo')
      await usuario.click(within(linha()).getByRole('button', { name: 'Publicar' }))

      expect(await within(linha()).findByRole('alert')).toHaveTextContent(
        code === 'CONFLITO_CONCORRENCIA' ? MENSAGEM_DE_CONFLITO.acao : message,
      )
      expect(within(linha()).getByText('Rascunho')).toBeInTheDocument()
    },
  )
})
