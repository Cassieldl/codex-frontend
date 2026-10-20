import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { keycloak } from '../../../../auth/keycloak'
import { server } from '../../../../test/mocks/server'
import { ErrosPage } from './erros'

const API_URL = import.meta.env.VITE_API_URL

const TODAS_AS_ROLES = [
  'erros-buscar',
  'erros-adicionar',
  'erros-atualizar',
  'erros-remover',
  'erros-publicar',
]

// JSON transcrito de `ErroAdminListaItemDto`, sem anotação do tipo do cliente.
const ERRO_RASCUNHO = {
  id: 21,
  slug: 'e0117-rps-ja-convertido',
  codigo: 'E0117',
  origem: 'Prefeitura',
  titulo: 'RPS já convertido em NFS-e',
  publicado: false,
  versaoConcorrencia: 4,
}

const ERRO_PUBLICADO = {
  id: 22,
  slug: 'e0118-cnpj-do-tomador-invalido',
  codigo: 'E0118',
  origem: 'Schema',
  titulo: 'CNPJ do tomador inválido',
  publicado: true,
  versaoConcorrencia: 9,
}

type ItemDaListaJson = typeof ERRO_RASCUNHO

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

function paginaDeErros(itens: ItemDaListaJson[]) {
  return {
    items: itens,
    totalCount: itens.length,
    page: 1,
    pageSize: 25,
    totalPages: itens.length === 0 ? 0 : 1,
  }
}

/** Sem provedor, o formulário não busca versões: a página fica só com as chamadas de erros. */
function handlerProvedoresVazio() {
  return http.get(`${API_URL}/interno/provedores`, () =>
    HttpResponse.json({ items: [], totalCount: 0, page: 1, pageSize: 200, totalPages: 0 }),
  )
}

/** Estado do servidor de mentira: remover e publicar mexem na lista que o GET seguinte devolve. */
function criarServidorDeErros(itensIniciais: ItemDaListaJson[], falhaNaRemocao?: FalhaSimulada) {
  const itens = itensIniciais.map((item) => ({ ...item }))
  const escritas: EscritaRecebida[] = []

  server.use(
    handlerProvedoresVazio(),
    http.get(`${API_URL}/interno/erros`, () => HttpResponse.json(paginaDeErros(itens))),
    http.delete(`${API_URL}/interno/erros/:id`, ({ request, params }) => {
      const ifMatch = request.headers.get('If-Match')
      escritas.push({ metodo: 'DELETE', url: request.url, ifMatch, corpo: null })

      if (falhaNaRemocao) {
        return HttpResponse.json(falhaNaRemocao.corpo, { status: falhaNaRemocao.status })
      }

      if (!ifMatch) {
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

      const indice = itens.findIndex((item) => item.id === Number(params.id))
      itens.splice(indice, 1)
      return new HttpResponse(null, { status: 204 })
    }),
    http.put(`${API_URL}/interno/erros/:id/publicacao`, async ({ request, params }) => {
      const corpo = (await request.json()) as { publicado: boolean }
      escritas.push({
        metodo: 'PUT',
        url: request.url,
        ifMatch: request.headers.get('If-Match'),
        corpo,
      })

      const erro = itens.find((item) => item.id === Number(params.id))
      if (!erro) return new HttpResponse(null, { status: 404 })

      erro.publicado = corpo.publicado
      erro.versaoConcorrencia += 1

      // JSON transcrito de `ApiResponse<ErroAdminDetalheDto>`.
      return HttpResponse.json({
        data: {
          ...erro,
          causaProvavel: null,
          solucaoSugerida: null,
          variantes: [],
          versoesProvedorIds: [],
          camposLayoutIds: [],
        },
        message: null,
      })
    }),
  )

  return { escritas }
}

function autenticarCom(roles: string[]) {
  keycloak.tokenParsed = { resource_access: { 'codex-backend': { roles } } }
}

function renderizarPagina() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return render(<ErrosPage />, { wrapper: Wrapper })
}

function linhaDoErro(codigo: string): HTMLElement {
  return screen.getByRole('row', { name: new RegExp(codigo) })
}

async function abrirConfirmacaoDeRemocao(codigo: string) {
  const usuario = userEvent.setup()
  await screen.findByText(codigo)
  await usuario.click(
    within(linhaDoErro(codigo)).getByRole('button', { name: `Remover erro ${codigo}` }),
  )
  await screen.findByRole('heading', { name: 'Remover erro' })
  return usuario
}

beforeEach(() => {
  autenticarCom(TODAS_AS_ROLES)
})

afterEach(() => {
  keycloak.tokenParsed = undefined
})

describe('ErrosPage: estados de carregamento', () => {
  it('anuncia o carregamento antes de a lista chegar', async () => {
    criarServidorDeErros([ERRO_RASCUNHO])

    renderizarPagina()

    expect(screen.getByText('Carregando erros…')).toBeInTheDocument()
    expect(await screen.findByText('E0117')).toBeInTheDocument()
  })

  it('falha na listagem oferece nova tentativa, e a nova tentativa traz a lista', async () => {
    const usuario = userEvent.setup()
    let tentativas = 0
    server.use(
      handlerProvedoresVazio(),
      http.get(`${API_URL}/interno/erros`, () => {
        tentativas += 1
        if (tentativas === 1) return new HttpResponse(null, { status: 500 })
        return HttpResponse.json(paginaDeErros([ERRO_RASCUNHO]))
      }),
    )

    renderizarPagina()

    await usuario.click(await screen.findByRole('button', { name: /tentar novamente/i }))

    expect(await screen.findByText('E0117')).toBeInTheDocument()
    expect(tentativas).toBe(2)
  })

  it('lista vazia mostra o estado vazio, nunca a tabela sem linhas', async () => {
    criarServidorDeErros([])

    renderizarPagina()

    expect(await screen.findByText('Nenhum erro cadastrado ainda.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('ErrosPage: cada ação depende da própria role', () => {
  const BOTOES_POR_ACAO = {
    atualizar: /^editar erro/i,
    publicar: /^(publicar|despublicar)$/i,
    remover: /^remover erro/i,
  }

  it('só com erros-buscar, nenhuma ação de escrita aparece', async () => {
    autenticarCom(['erros-buscar'])
    criarServidorDeErros([ERRO_RASCUNHO])

    renderizarPagina()

    await screen.findByText('E0117')
    for (const nome of Object.values(BOTOES_POR_ACAO)) {
      expect(screen.queryByRole('button', { name: nome })).not.toBeInTheDocument()
    }
  })

  it.each([
    ['erros-atualizar', 'atualizar'],
    ['erros-publicar', 'publicar'],
    ['erros-remover', 'remover'],
  ] as const)('%s libera só o botão de %s', async (role, acaoLiberada) => {
    autenticarCom(['erros-buscar', role])
    criarServidorDeErros([ERRO_RASCUNHO])

    renderizarPagina()

    await screen.findByText('E0117')
    for (const [acao, nome] of Object.entries(BOTOES_POR_ACAO)) {
      const botao = screen.queryByRole('button', { name: nome })
      if (acao === acaoLiberada) expect(botao).toBeInTheDocument()
      else expect(botao).not.toBeInTheDocument()
    }
  })
})

describe('ErrosPage: remoção só depois de confirmar', () => {
  it('o clique na lixeira abre o diálogo e nenhum DELETE sai', async () => {
    const { escritas } = criarServidorDeErros([ERRO_PUBLICADO])

    renderizarPagina()
    await abrirConfirmacaoDeRemocao('E0118')

    expect(screen.getByText(/E0118 está publicado e sai do portal agora/)).toBeInTheDocument()
    expect(escritas).toHaveLength(0)
  })

  it('confirmar envia um DELETE com o If-Match do item, e o item sai da lista', async () => {
    const { escritas } = criarServidorDeErros([ERRO_RASCUNHO, ERRO_PUBLICADO])

    renderizarPagina()
    const usuario = await abrirConfirmacaoDeRemocao('E0118')
    await usuario.click(screen.getByRole('button', { name: 'Remover' }))

    await waitFor(() => expect(screen.queryByText('E0118')).not.toBeInTheDocument())
    expect(escritas).toEqual([
      { metodo: 'DELETE', url: `${API_URL}/interno/erros/22`, ifMatch: 'W/"9"', corpo: null },
    ])
    expect(screen.getByText('E0117')).toBeInTheDocument()
  })

  it.each([
    [
      409,
      'CONFLITO_CONCORRENCIA',
      'O erro foi alterado por outra requisição. Recarregue e tente novamente.',
    ],
    [412, 'ERRO_REQUISICAO', 'Não foi possível processar a requisição.'],
    [422, 'VALIDACAO_NEGOCIO', 'Este erro não pode ser removido no estado atual.'],
  ])('%i na remoção mostra a mensagem do servidor no diálogo', async (status, code, message) => {
    criarServidorDeErros([ERRO_PUBLICADO], { status, corpo: { error: { code, message } } })

    renderizarPagina()
    const usuario = await abrirConfirmacaoDeRemocao('E0118')
    await usuario.click(screen.getByRole('button', { name: 'Remover' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('heading', { name: 'Remover erro' })).toBeInTheDocument()
  })
})

describe('ErrosPage: publicação', () => {
  it('publicar envia PUT na rota de publicação com o If-Match do item, e a linha passa a publicada', async () => {
    const usuario = userEvent.setup()
    const { escritas } = criarServidorDeErros([ERRO_RASCUNHO])

    renderizarPagina()

    await screen.findByText('E0117')
    expect(within(linhaDoErro('E0117')).getByText('Rascunho')).toBeInTheDocument()

    await usuario.click(within(linhaDoErro('E0117')).getByRole('button', { name: 'Publicar' }))

    expect(
      await within(linhaDoErro('E0117')).findByRole('button', { name: 'Despublicar' }),
    ).toBeInTheDocument()
    expect(within(linhaDoErro('E0117')).getByText('Publicado')).toBeInTheDocument()
    expect(escritas).toEqual([
      {
        metodo: 'PUT',
        url: `${API_URL}/interno/erros/21/publicacao`,
        ifMatch: 'W/"4"',
        corpo: { publicado: true },
      },
    ])
  })

  it.each([
    [
      409,
      'CONFLITO_CONCORRENCIA',
      'O erro foi alterado por outra requisição. Recarregue e tente novamente.',
    ],
    [422, 'VALIDACAO_NEGOCIO', 'O erro não pode ser publicado no estado atual.'],
  ])(
    '%i ao publicar mostra a mensagem do servidor na linha do erro',
    async (status, code, message) => {
      const usuario = userEvent.setup()
      criarServidorDeErros([ERRO_RASCUNHO, ERRO_PUBLICADO])
      server.use(
        http.put(`${API_URL}/interno/erros/:id/publicacao`, () =>
          HttpResponse.json({ error: { code, message } }, { status }),
        ),
      )

      renderizarPagina()

      await screen.findByText('E0117')
      await usuario.click(within(linhaDoErro('E0117')).getByRole('button', { name: 'Publicar' }))

      expect(await within(linhaDoErro('E0117')).findByRole('alert')).toHaveTextContent(message)
      expect(within(linhaDoErro('E0117')).getByText('Rascunho')).toBeInTheDocument()
      expect(within(linhaDoErro('E0118')).queryByRole('alert')).not.toBeInTheDocument()
    },
  )
})

// JSON transcrito de `ApiResponse<ErroAdminDetalheDto>`: a versão é mais nova que a da lista.
const DETALHE_DO_ERRO_PUBLICADO = {
  data: {
    id: 22,
    slug: 'e0118-cnpj-do-tomador-invalido',
    codigo: 'E0118',
    origem: 'Schema',
    titulo: 'CNPJ do tomador inválido',
    causaProvavel: 'Dígito verificador do CNPJ não confere.',
    solucaoSugerida: null,
    publicado: true,
    variantes: ['CNPJ do tomador inválido.', 'Tomador com CNPJ inválido'],
    versoesProvedorIds: [],
    camposLayoutIds: [],
    versaoConcorrencia: 10,
  },
  message: null,
}

interface OpcoesDoDetalhe {
  /** O GET por id só responde depois que esta promessa resolve. */
  portao?: Promise<void>
  falhasAntesDeResponder?: number
}

/** GET por id e PUT de edição; o PUT registra o corpo recebido e devolve o detalhe atualizado. */
function servirEdicao({ portao, falhasAntesDeResponder = 0 }: OpcoesDoDetalhe = {}) {
  const escritas: EscritaRecebida[] = []
  let falhasRestantes = falhasAntesDeResponder

  server.use(
    http.get(`${API_URL}/interno/erros/:id`, async () => {
      await portao
      if (falhasRestantes > 0) {
        falhasRestantes -= 1
        return new HttpResponse(null, { status: 500 })
      }
      return HttpResponse.json(DETALHE_DO_ERRO_PUBLICADO)
    }),
    http.put(`${API_URL}/interno/erros/:id`, async ({ request }) => {
      const corpo: unknown = await request.json()
      escritas.push({
        metodo: 'PUT',
        url: request.url,
        ifMatch: request.headers.get('If-Match'),
        corpo,
      })
      return HttpResponse.json({
        data: { ...DETALHE_DO_ERRO_PUBLICADO.data, versaoConcorrencia: 11 },
        message: 'Erro atualizado com sucesso.',
      })
    }),
  )

  return { escritas }
}

async function abrirEdicao(codigo: string) {
  const usuario = userEvent.setup()
  await screen.findByText(codigo)
  await usuario.click(
    within(linhaDoErro(codigo)).getByRole('button', { name: `Editar erro ${codigo}` }),
  )
  await screen.findByRole('heading', { name: 'Editar erro' })
  return usuario
}

describe('ErrosPage: edição parte do detalhe, não do item da lista', () => {
  it('Editar busca o detalhe e abre o formulário preenchido com ele', async () => {
    let liberarDetalhe = () => {}
    const portao = new Promise<void>((resolver) => {
      liberarDetalhe = resolver
    })
    criarServidorDeErros([ERRO_PUBLICADO])
    servirEdicao({ portao })

    renderizarPagina()
    await abrirEdicao('E0118')

    expect(await screen.findByText('Carregando erro…')).toBeInTheDocument()
    liberarDetalhe()

    expect(await screen.findByRole('textbox', { name: /Título/ })).toHaveValue(
      'CNPJ do tomador inválido',
    )
    expect(screen.getByRole('textbox', { name: /Causa provável/ })).toHaveValue(
      'Dígito verificador do CNPJ não confere.',
    )
    expect(screen.getByRole('textbox', { name: 'Variante 2' })).toHaveValue(
      'Tomador com CNPJ inválido',
    )
  })

  it('falha ao buscar o detalhe oferece nova tentativa, e a nova tentativa abre o formulário', async () => {
    criarServidorDeErros([ERRO_PUBLICADO])
    servirEdicao({ falhasAntesDeResponder: 1 })

    renderizarPagina()
    const usuario = await abrirEdicao('E0118')

    await usuario.click(await screen.findByRole('button', { name: /tentar novamente/i }))

    expect(await screen.findByRole('textbox', { name: /Título/ })).toHaveValue(
      'CNPJ do tomador inválido',
    )
  })

  it('o código aparece só para leitura e o PUT não leva codigo, com o If-Match do detalhe', async () => {
    criarServidorDeErros([ERRO_PUBLICADO])
    const { escritas } = servirEdicao()

    renderizarPagina()
    const usuario = await abrirEdicao('E0118')

    const campoCodigo = await screen.findByRole('textbox', { name: /Código/ })
    expect(campoCodigo).toHaveValue('E0118')
    expect(campoCodigo).toHaveAttribute('readonly')
    await usuario.type(campoCodigo, 'X')
    expect(campoCodigo).toHaveValue('E0118')

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0].corpo).not.toHaveProperty('codigo')
    expect(escritas).toEqual([
      {
        metodo: 'PUT',
        url: `${API_URL}/interno/erros/22`,
        ifMatch: 'W/"10"',
        corpo: {
          origem: 'Schema',
          titulo: 'CNPJ do tomador inválido',
          causaProvavel: 'Dígito verificador do CNPJ não confere.',
          variantes: ['CNPJ do tomador inválido.', 'Tomador com CNPJ inválido'],
          versoesProvedorIds: [],
          camposLayoutIds: [],
        },
      },
    ])
  })
})
