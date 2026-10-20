import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { keycloak } from '../../../../auth/keycloak'
import { server } from '../../../../test/mocks/server'
import { CamposLayoutPage } from './camposLayout'
import { MENSAGEM_DE_CONFLITO } from '../../utils/mensagemDeErroDeEscrita'

const API_URL = import.meta.env.VITE_API_URL

const TODAS_AS_ROLES = [
  'versoeslayout-buscar',
  'versoeslayout-adicionar',
  'versoeslayout-atualizar',
  'versoeslayout-remover',
  'versoeslayout-publicar',
]

// JSON transcrito de `VersaoLayoutAdminDto`, sem anotação do tipo do cliente.
const VERSAO_VIGENTE = {
  id: 31,
  rotulo: 'Layout 8.00',
  slug: 'layout-8-00',
  estado: 'Vigente',
  ordem: 1,
  publicado: false,
  descricao: 'Versão em uso pelo InvoiCy.' as string | null,
  versaoConcorrencia: 7,
}

type ItemDaListaJson = typeof VERSAO_VIGENTE

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

function paginaDeVersoes(itens: ItemDaListaJson[]) {
  return {
    items: itens,
    totalCount: itens.length,
    page: 1,
    pageSize: 25,
    totalPages: itens.length === 0 ? 0 : 1,
  }
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

/** Estado do servidor de mentira: criar, editar e publicar mexem na lista que o GET seguinte devolve. */
function criarServidorDeVersoes(itensIniciais: ItemDaListaJson[], falhaNaEdicao?: FalhaSimulada) {
  const itens = itensIniciais.map((item) => ({ ...item }))
  const escritas: EscritaRecebida[] = []

  // As respostas de escrita são `ApiResponse<VersaoLayoutAdminDto>`.
  server.use(
    http.get(`${API_URL}/interno/layout/versoes`, () => HttpResponse.json(paginaDeVersoes(itens))),
    http.post(`${API_URL}/interno/layout/versoes`, async ({ request }) => {
      const corpo = (await request.json()) as { rotulo: string; descricao?: string }
      escritas.push({
        metodo: 'POST',
        url: request.url,
        ifMatch: request.headers.get('If-Match'),
        corpo,
      })

      const criada = {
        id: 32,
        rotulo: corpo.rotulo,
        slug: 'layout-9-00',
        estado: 'Prevista',
        ordem: 2,
        publicado: false,
        descricao: corpo.descricao ?? null,
        versaoConcorrencia: 1,
      }
      itens.push(criada)
      return HttpResponse.json(
        { data: criada, message: 'Versão de layout criada com sucesso.' },
        { status: 201 },
      )
    }),
    http.put(`${API_URL}/interno/layout/versoes/:id`, async ({ request, params }) => {
      const corpo = (await request.json()) as { rotulo?: string; estado?: string }
      const ifMatch = request.headers.get('If-Match')
      escritas.push({ metodo: 'PUT', url: request.url, ifMatch, corpo })

      if (falhaNaEdicao) {
        return HttpResponse.json(falhaNaEdicao.corpo, { status: falhaNaEdicao.status })
      }
      if (!ifMatch) return respostaSemIfMatch()

      const versao = itens.find((item) => item.id === Number(params.id))
      if (!versao) return new HttpResponse(null, { status: 404 })

      versao.rotulo = corpo.rotulo ?? versao.rotulo
      versao.estado = corpo.estado ?? versao.estado
      versao.versaoConcorrencia += 1
      return HttpResponse.json({
        data: versao,
        message: 'Versão de layout atualizada com sucesso.',
      })
    }),
    http.put(`${API_URL}/interno/layout/versoes/:id/publicacao`, async ({ request, params }) => {
      const corpo = (await request.json()) as { publicado: boolean }
      const ifMatch = request.headers.get('If-Match')
      escritas.push({ metodo: 'PUT', url: request.url, ifMatch, corpo })

      if (!ifMatch) return respostaSemIfMatch()

      const versao = itens.find((item) => item.id === Number(params.id))
      if (!versao) return new HttpResponse(null, { status: 404 })

      versao.publicado = corpo.publicado
      versao.versaoConcorrencia += 1
      return HttpResponse.json({ data: versao })
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
    path: '/interno/campos-layout',
    component: CamposLayoutPage,
  })
  const router = createRouter({
    routeTree: rotaRaiz.addChildren([rotaLista]),
    history: createMemoryHistory({ initialEntries: ['/interno/campos-layout'] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function linhaDaVersao(rotulo: string): HTMLElement {
  return screen.getByRole('row', { name: new RegExp(rotulo) })
}

async function editarRotulo(rotuloAtual: string, rotuloNovo: string) {
  const usuario = userEvent.setup()
  await screen.findByText(rotuloAtual)
  await usuario.click(
    within(linhaDaVersao(rotuloAtual)).getByRole('button', {
      name: `Editar versão do layout ${rotuloAtual}`,
    }),
  )
  await screen.findByRole('heading', { name: 'Editar versão do Layout InvoiCy' })

  const campoRotulo = screen.getByRole('textbox', { name: /Rótulo/ })
  expect(campoRotulo).toHaveValue(rotuloAtual)
  await usuario.clear(campoRotulo)
  await usuario.type(campoRotulo, rotuloNovo)
  await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
}

beforeEach(() => {
  autenticarCom(TODAS_AS_ROLES)
})

afterEach(() => {
  keycloak.tokenParsed = undefined
})

describe('CamposLayoutPage: estados de carregamento', () => {
  it('anuncia o carregamento antes de a lista chegar', async () => {
    criarServidorDeVersoes([VERSAO_VIGENTE])

    renderizarPagina()

    expect(await screen.findByText('Carregando versões do layout…')).toBeInTheDocument()
    expect(await screen.findByText('Layout 8.00')).toBeInTheDocument()
  })

  it('falha na listagem oferece nova tentativa, e a nova tentativa traz a lista', async () => {
    const usuario = userEvent.setup()
    let tentativas = 0
    server.use(
      http.get(`${API_URL}/interno/layout/versoes`, () => {
        tentativas += 1
        if (tentativas === 1) return new HttpResponse(null, { status: 500 })
        return HttpResponse.json(paginaDeVersoes([VERSAO_VIGENTE]))
      }),
    )

    renderizarPagina()

    await usuario.click(await screen.findByRole('button', { name: /tentar novamente/i }))

    expect(await screen.findByText('Layout 8.00')).toBeInTheDocument()
    expect(tentativas).toBe(2)
  })

  it('lista vazia mostra o estado vazio, nunca a tabela sem linhas', async () => {
    criarServidorDeVersoes([])

    renderizarPagina()

    expect(
      await screen.findByText('Nenhuma versão do Layout InvoiCy cadastrada ainda.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('CamposLayoutPage: cada ação depende da própria role', () => {
  const BOTOES_POR_ACAO = {
    adicionar: /^nova versão do layout$/i,
    atualizar: /^editar versão do layout/i,
    publicar: /^(publicar|despublicar)$/i,
  }

  it('só com versoeslayout-buscar, nenhuma ação de escrita aparece', async () => {
    autenticarCom(['versoeslayout-buscar'])
    criarServidorDeVersoes([VERSAO_VIGENTE])

    renderizarPagina()

    await screen.findByText('Layout 8.00')
    for (const nome of Object.values(BOTOES_POR_ACAO)) {
      expect(screen.queryByRole('button', { name: nome })).not.toBeInTheDocument()
    }
  })

  it.each([
    ['versoeslayout-adicionar', 'adicionar'],
    ['versoeslayout-atualizar', 'atualizar'],
    ['versoeslayout-publicar', 'publicar'],
  ] as const)('%s libera só o botão de %s', async (role, acaoLiberada) => {
    autenticarCom(['versoeslayout-buscar', role])
    criarServidorDeVersoes([VERSAO_VIGENTE])

    renderizarPagina()

    await screen.findByText('Layout 8.00')
    for (const [acao, nome] of Object.entries(BOTOES_POR_ACAO)) {
      const botao = screen.queryByRole('button', { name: nome })
      if (acao === acaoLiberada) expect(botao).toBeInTheDocument()
      else expect(botao).not.toBeInTheDocument()
    }
  })
})

describe('CamposLayoutPage: criação', () => {
  it('salvar envia POST sem If-Match nem estado, fecha o modal e a linha nova aparece', async () => {
    const usuario = userEvent.setup()
    const { escritas } = criarServidorDeVersoes([VERSAO_VIGENTE])

    renderizarPagina()

    await usuario.click(await screen.findByRole('button', { name: 'Nova versão do layout' }))
    await screen.findByRole('heading', { name: 'Nova versão do Layout InvoiCy' })
    await usuario.type(screen.getByRole('textbox', { name: /Rótulo/ }), 'Layout 9.00')
    await usuario.type(screen.getByRole('textbox', { name: /Descrição/ }), 'Prevista para 2027.')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Layout 9.00')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Nova versão do Layout InvoiCy' }),
    ).not.toBeInTheDocument()
    expect(within(linhaDaVersao('Layout 9.00')).getByText('Prevista')).toBeInTheDocument()
    expect(escritas).toEqual([
      {
        metodo: 'POST',
        url: `${API_URL}/interno/layout/versoes`,
        ifMatch: null,
        corpo: { rotulo: 'Layout 9.00', descricao: 'Prevista para 2027.' },
      },
    ])
  })
})

describe('CamposLayoutPage: edição', () => {
  it('salvar envia PUT com o If-Match do item e o estado atual, e a linha mostra o rótulo novo', async () => {
    const { escritas } = criarServidorDeVersoes([VERSAO_VIGENTE])

    renderizarPagina()
    await editarRotulo('Layout 8.00', 'Layout 8.01')

    expect(await screen.findByText('Layout 8.01')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Editar versão do Layout InvoiCy' }),
    ).not.toBeInTheDocument()
    expect(escritas).toEqual([
      {
        metodo: 'PUT',
        url: `${API_URL}/interno/layout/versoes/31`,
        ifMatch: 'W/"7"',
        corpo: {
          rotulo: 'Layout 8.01',
          descricao: 'Versão em uso pelo InvoiCy.',
          estado: 'Vigente',
        },
      },
    ])
  })

  it.each([
    [409, 'CONFLITO_CONCORRENCIA', 'A versão foi alterada por outra requisição. Recarregue.'],
    [422, 'VALIDACAO_NEGOCIO', 'Transição de estado inválida: Vigente para Prevista.'],
  ])('%i na edição mostra a mensagem do servidor no modal', async (status, code, message) => {
    criarServidorDeVersoes([VERSAO_VIGENTE], { status, corpo: { error: { code, message } } })

    renderizarPagina()
    await editarRotulo('Layout 8.00', 'Layout 8.01')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      code === 'CONFLITO_CONCORRENCIA' ? MENSAGEM_DE_CONFLITO.formulario : message,
    )
    expect(
      screen.getByRole('heading', { name: 'Editar versão do Layout InvoiCy' }),
    ).toBeInTheDocument()
  })

  it('apagar a descrição envia string vazia, que o backend lê como limpar', async () => {
    const usuario = userEvent.setup()
    const { escritas } = criarServidorDeVersoes([VERSAO_VIGENTE])

    renderizarPagina()
    await screen.findByText('Layout 8.00')
    await usuario.click(
      within(linhaDaVersao('Layout 8.00')).getByRole('button', {
        name: 'Editar versão do layout Layout 8.00',
      }),
    )
    await screen.findByRole('heading', { name: 'Editar versão do Layout InvoiCy' })

    const campoDescricao = screen.getByRole('textbox', { name: /Descrição/ })
    expect(campoDescricao).toHaveValue('Versão em uso pelo InvoiCy.')
    await usuario.clear(campoDescricao)
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0].corpo).toEqual({ rotulo: 'Layout 8.00', descricao: '', estado: 'Vigente' })
  })
})

describe('CamposLayoutPage: publicação', () => {
  it('publicar envia PUT na rota de publicação com o If-Match do item, e a linha passa a publicada', async () => {
    const usuario = userEvent.setup()
    const { escritas } = criarServidorDeVersoes([VERSAO_VIGENTE])

    renderizarPagina()

    await screen.findByText('Layout 8.00')
    const linha = () => linhaDaVersao('Layout 8.00')
    expect(within(linha()).getByText('Rascunho')).toBeInTheDocument()

    await usuario.click(within(linha()).getByRole('button', { name: 'Publicar' }))

    expect(await within(linha()).findByRole('button', { name: 'Despublicar' })).toBeInTheDocument()
    expect(within(linha()).getByText('Publicado')).toBeInTheDocument()
    await waitFor(() =>
      expect(escritas).toEqual([
        {
          metodo: 'PUT',
          url: `${API_URL}/interno/layout/versoes/31/publicacao`,
          ifMatch: 'W/"7"',
          corpo: { publicado: true },
        },
      ]),
    )
  })

  it.each([
    [
      409,
      'CONFLITO_CONCORRENCIA',
      'A versão do layout foi alterada por outra requisição. Recarregue e tente novamente.',
    ],
    [422, 'VALIDACAO_NEGOCIO', 'A versão do layout não pode ser publicada no estado atual.'],
  ])(
    '%i ao publicar mostra a mensagem do servidor na linha da versão',
    async (status, code, message) => {
      const usuario = userEvent.setup()
      criarServidorDeVersoes([VERSAO_VIGENTE])
      server.use(
        http.put(`${API_URL}/interno/layout/versoes/:id/publicacao`, () =>
          HttpResponse.json({ error: { code, message } }, { status }),
        ),
      )

      renderizarPagina()

      await screen.findByText('Layout 8.00')
      const linha = () => linhaDaVersao('Layout 8.00')
      await usuario.click(within(linha()).getByRole('button', { name: 'Publicar' }))

      expect(await within(linha()).findByRole('alert')).toHaveTextContent(
        code === 'CONFLITO_CONCORRENCIA' ? MENSAGEM_DE_CONFLITO.acao : message,
      )
      expect(within(linha()).getByText('Rascunho')).toBeInTheDocument()
    },
  )
})

describe('CamposLayoutPage: 409 na edição', () => {
  afterEach(() => {
    focusManager.setFocused(undefined)
  })

  it('refoco sem 409 mantém o etag da abertura, e só depois do 409 vale o relido', async () => {
    const usuario = userEvent.setup()
    let versaoNoServidor = 7
    let leiturasDaLista = 0
    const ifMatchRecebidos: (string | null)[] = []

    server.use(
      http.get(`${API_URL}/interno/layout/versoes`, () => {
        leiturasDaLista += 1
        return HttpResponse.json(
          paginaDeVersoes([{ ...VERSAO_VIGENTE, versaoConcorrencia: versaoNoServidor }]),
        )
      }),
      http.put(`${API_URL}/interno/layout/versoes/:id`, ({ request }) => {
        const ifMatch = request.headers.get('If-Match')
        ifMatchRecebidos.push(ifMatch)
        if (ifMatch !== `W/"${versaoNoServidor}"`) {
          return HttpResponse.json(
            { error: { code: 'CONFLITO_CONCORRENCIA', message: 'A versão foi alterada.' } },
            { status: 409 },
          )
        }
        return HttpResponse.json({ data: { ...VERSAO_VIGENTE, versaoConcorrencia: 10 } })
      }),
    )

    renderizarPagina()
    await screen.findByText('Layout 8.00')
    await usuario.click(
      within(linhaDaVersao('Layout 8.00')).getByRole('button', {
        name: 'Editar versão do layout Layout 8.00',
      }),
    )
    const campoRotulo = await screen.findByRole('textbox', { name: /Rótulo/ })
    await usuario.clear(campoRotulo)
    await usuario.type(campoRotulo, 'Layout 8.01')

    // Outra pessoa salva e a aba volta ao foco: a lista relida traz o etag novo.
    versaoNoServidor = 9
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })
    await waitFor(() => expect(leiturasDaLista).toBe(2))

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_DE_CONFLITO.formulario)
    expect(screen.getByRole('textbox', { name: /Rótulo/ })).toHaveValue('Layout 8.01')
    await waitFor(() => expect(leiturasDaLista).toBe(3))

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Editar versão do Layout InvoiCy' }),
      ).not.toBeInTheDocument(),
    )
    expect(ifMatchRecebidos).toEqual(['W/"7"', 'W/"9"'])
  })
})
