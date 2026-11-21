import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { keycloak } from '../../../../auth/keycloak'
import { server } from '../../../../test/mocks/server'
import { ErrosPage } from './erros'
import { MENSAGEM_DE_CONFLITO } from '../../utils/mensagemDeErroDeEscrita'

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

/** Despublicar e remover moram no menu de mais ações da linha. */
async function abrirMenuDoErro(codigo: string, usuario = userEvent.setup()) {
  await usuario.click(
    within(linhaDoErro(codigo)).getByRole('button', { name: `Mais ações do erro ${codigo}` }),
  )
  await screen.findByRole('menu')
  return usuario
}

async function abrirConfirmacaoDeRemocao(codigo: string) {
  await screen.findByText(codigo)
  const usuario = await abrirMenuDoErro(codigo)
  await usuario.click(screen.getByRole('menuitem', { name: `Remover erro ${codigo}` }))
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
  // No rascunho, editar é o título da linha, publicar fica visível e remover vive no menu.
  const BOTOES_POR_ACAO = {
    atualizar: ERRO_RASCUNHO.titulo,
    publicar: /^publicar$/i,
    remover: /^mais ações do erro/i,
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      code === 'CONFLITO_CONCORRENCIA' ? MENSAGEM_DE_CONFLITO.acao : message,
    )
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

    expect(await within(linhaDoErro('E0117')).findByText('Publicado')).toBeInTheDocument()
    expect(
      within(linhaDoErro('E0117')).queryByRole('button', { name: 'Publicar' }),
    ).not.toBeInTheDocument()
    await abrirMenuDoErro('E0117', usuario)
    expect(screen.getByRole('menuitem', { name: 'Despublicar' })).toBeInTheDocument()
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

      expect(await within(linhaDoErro('E0117')).findByRole('alert')).toHaveTextContent(
        code === 'CONFLITO_CONCORRENCIA' ? MENSAGEM_DE_CONFLITO.acao : message,
      )
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
  // O título da linha é o gesto de editar.
  const celulaDoTitulo = within(linhaDoErro(codigo)).getAllByRole('cell')[1]
  await usuario.click(within(celulaDoTitulo).getByRole('button'))
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

describe('ErrosPage: formulário maior que a tela', () => {
  it('o diálogo rola e o Tab alcança o Salvar', async () => {
    const usuario = userEvent.setup()
    criarServidorDeErros([ERRO_RASCUNHO])

    renderizarPagina()
    await screen.findByText('E0117')
    await usuario.click(screen.getByRole('button', { name: 'Novo erro' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Novo erro' })
    expect(dialogo.className).toContain('overflow-y-auto')
    expect(dialogo.className).toMatch(/max-h-\[calc\(100dvh-/)

    const salvar = within(dialogo).getByRole('button', { name: 'Salvar' })
    for (let tecla = 0; tecla < 30 && document.activeElement !== salvar; tecla += 1) {
      await usuario.tab()
    }
    expect(salvar).toHaveFocus()
  })
})

// JSON transcrito de `ProvedorAdminListaItemDto` e `VersaoAdminListaItemDto`.
const PROVEDOR_NACIONAL = {
  id: 41,
  slug: 'emissor-nacional',
  nome: 'Emissor Nacional',
  categoria: 'Nacional',
  identificadorInvoicy: 'NACIONAL',
  publicado: true,
  versaoConcorrencia: 3,
}

const PROVEDOR_JOINVILLE = {
  id: 42,
  slug: 'joinville',
  nome: 'Joinville',
  categoria: 'Proprio',
  identificadorInvoicy: 'JOINVILLE',
  publicado: true,
  versaoConcorrencia: 5,
}

function versaoDoProvedor(id: number, provedorId: number, rotulo: string) {
  return {
    id,
    provedorId,
    slug: rotulo.toLowerCase().replace(/\W+/g, '-'),
    rotulo,
    versaoLayoutId: 2,
    publicado: true,
    verificadoEm: null,
    versaoConcorrencia: 1,
  }
}

describe('ErrosPage: versões de todos os provedores no formulário', () => {
  it('erro ligado à versão do segundo provedor abre com ela marcada e salva sem perder o vínculo', async () => {
    let liberarVersoesDoSegundo = () => {}
    const portao = new Promise<void>((resolver) => {
      liberarVersoesDoSegundo = resolver
    })
    const corposDoPut: unknown[] = []

    server.use(
      http.get(`${API_URL}/interno/provedores`, () =>
        HttpResponse.json({
          items: [PROVEDOR_NACIONAL, PROVEDOR_JOINVILLE],
          totalCount: 2,
          page: 1,
          pageSize: 200,
          totalPages: 1,
        }),
      ),
      http.get(`${API_URL}/interno/provedores/41/versoes`, () =>
        HttpResponse.json({ data: [versaoDoProvedor(51, 41, '1.00')], message: null }),
      ),
      http.get(`${API_URL}/interno/provedores/42/versoes`, async () => {
        await portao
        return HttpResponse.json({ data: [versaoDoProvedor(52, 42, 'ABRASF 2.04')], message: null })
      }),
      http.get(`${API_URL}/interno/erros`, () => HttpResponse.json(paginaDeErros([ERRO_RASCUNHO]))),
      http.get(`${API_URL}/interno/erros/:id`, () =>
        HttpResponse.json({
          data: {
            ...ERRO_RASCUNHO,
            causaProvavel: null,
            solucaoSugerida: null,
            variantes: ['RPS já convertido'],
            versoesProvedorIds: [52],
            camposLayoutIds: [],
          },
          message: null,
        }),
      ),
      http.put(`${API_URL}/interno/erros/:id`, async ({ request }) => {
        corposDoPut.push(await request.json())
        return HttpResponse.json({ data: { ...ERRO_RASCUNHO }, message: null })
      }),
    )

    renderizarPagina()
    const usuario = await abrirEdicao('E0117')

    expect(await screen.findByText('Carregando provedores e versões…')).toBeInTheDocument()
    expect(
      await screen.findByRole('checkbox', { name: 'Emissor Nacional · 1.00' }),
    ).not.toBeChecked()

    liberarVersoesDoSegundo()

    expect(await screen.findByRole('checkbox', { name: 'Joinville · ABRASF 2.04' })).toBeChecked()
    expect(screen.queryByText('Carregando provedores e versões…')).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(corposDoPut).toHaveLength(1))
    expect(corposDoPut[0]).toMatchObject({ versoesProvedorIds: [52] })
  })
})

describe('ErrosPage: 409 na edição', () => {
  it('mantém o que foi digitado e a segunda tentativa sai com o etag relido e passa', async () => {
    criarServidorDeErros([ERRO_PUBLICADO])
    let versaoNoServidor = 10
    let leiturasDoDetalhe = 0
    const tentativas: { ifMatch: string | null; titulo: unknown }[] = []

    server.use(
      http.get(`${API_URL}/interno/erros/:id`, () => {
        leiturasDoDetalhe += 1
        const resposta = HttpResponse.json({
          data: { ...DETALHE_DO_ERRO_PUBLICADO.data, versaoConcorrencia: versaoNoServidor },
          message: null,
        })
        // Outra pessoa salva logo depois de o modal abrir.
        versaoNoServidor = 12
        return resposta
      }),
      http.put(`${API_URL}/interno/erros/:id`, async ({ request }) => {
        const ifMatch = request.headers.get('If-Match')
        const corpo = (await request.json()) as { titulo: unknown }
        tentativas.push({ ifMatch, titulo: corpo.titulo })

        if (ifMatch !== `W/"${versaoNoServidor}"`) {
          return HttpResponse.json(
            {
              error: {
                code: 'CONFLITO_CONCORRENCIA',
                message: 'O erro foi alterado por outra requisição. Recarregue e tente novamente.',
              },
            },
            { status: 409 },
          )
        }
        return HttpResponse.json({ data: DETALHE_DO_ERRO_PUBLICADO.data, message: null })
      }),
    )

    renderizarPagina()
    const usuario = await abrirEdicao('E0118')

    const titulo = await screen.findByRole('textbox', { name: /Título/ })
    await usuario.clear(titulo)
    await usuario.type(titulo, 'CNPJ do tomador recusado')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_DE_CONFLITO.formulario)
    expect(screen.getByRole('textbox', { name: /Título/ })).toHaveValue('CNPJ do tomador recusado')
    await waitFor(() => expect(leiturasDoDetalhe).toBe(2))

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Editar erro' })).not.toBeInTheDocument(),
    )
    expect(tentativas).toEqual([
      { ifMatch: 'W/"10"', titulo: 'CNPJ do tomador recusado' },
      { ifMatch: 'W/"12"', titulo: 'CNPJ do tomador recusado' },
    ])
  })
})

describe('ErrosPage: 409 na remoção', () => {
  it('a segunda confirmação sai com o etag da lista relida, não com o do item guardado ao abrir', async () => {
    let versaoNoServidor = 9
    let leiturasDaLista = 0
    let removido = false
    const ifMatchRecebidos: (string | null)[] = []

    server.use(
      handlerProvedoresVazio(),
      http.get(`${API_URL}/interno/erros`, () => {
        leiturasDaLista += 1
        const itens = removido ? [] : [{ ...ERRO_PUBLICADO, versaoConcorrencia: versaoNoServidor }]
        // Outra pessoa publica de novo logo depois de a lista chegar.
        versaoNoServidor = 11
        return HttpResponse.json(paginaDeErros(itens))
      }),
      http.delete(`${API_URL}/interno/erros/:id`, ({ request }) => {
        const ifMatch = request.headers.get('If-Match')
        ifMatchRecebidos.push(ifMatch)
        if (ifMatch !== `W/"${versaoNoServidor}"`) {
          return HttpResponse.json(
            {
              error: {
                code: 'CONFLITO_CONCORRENCIA',
                message: 'O erro foi alterado por outra requisição. Recarregue e tente novamente.',
              },
            },
            { status: 409 },
          )
        }
        removido = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderizarPagina()
    const usuario = await abrirConfirmacaoDeRemocao('E0118')
    await usuario.click(screen.getByRole('button', { name: 'Remover' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_DE_CONFLITO.acao)
    await waitFor(() => expect(leiturasDaLista).toBe(2))

    await usuario.click(screen.getByRole('button', { name: 'Remover' }))

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Remover erro' })).not.toBeInTheDocument(),
    )
    expect(ifMatchRecebidos).toEqual(['W/"9"', 'W/"11"'])
  })
})

describe('ErrosPage: opções de versões só com o modal aberto', () => {
  it('a lista sozinha não busca provedores nem versões; abrir "Novo erro" busca', async () => {
    const usuario = userEvent.setup()
    const leiturasDeProvedores: string[] = []
    criarServidorDeErros([ERRO_RASCUNHO])
    server.use(
      http.get(`${API_URL}/interno/provedores`, ({ request }) => {
        leiturasDeProvedores.push(new URL(request.url).pathname)
        return HttpResponse.json({
          items: [PROVEDOR_NACIONAL],
          totalCount: 1,
          page: 1,
          pageSize: 200,
          totalPages: 1,
        })
      }),
      http.get(`${API_URL}/interno/provedores/:id/versoes`, ({ request }) => {
        leiturasDeProvedores.push(new URL(request.url).pathname)
        return HttpResponse.json({ data: [versaoDoProvedor(51, 41, '1.00')], message: null })
      }),
    )

    renderizarPagina()
    await screen.findByText('E0117')
    expect(leiturasDeProvedores).toEqual([])

    await usuario.click(screen.getByRole('button', { name: 'Novo erro' }))

    expect(
      await screen.findByRole('checkbox', { name: 'Emissor Nacional · 1.00' }),
    ).toBeInTheDocument()
    expect(leiturasDeProvedores).toHaveLength(2)
  })
})

describe('ErrosPage: busca, filtros e ordenação', () => {
  /** Lista de três páginas que guarda a query string de cada leitura. */
  function criarServidorQueRegistraLeituras() {
    const leituras: URLSearchParams[] = []
    server.use(
      handlerProvedoresVazio(),
      http.get(`${API_URL}/interno/erros`, ({ request }) => {
        leituras.push(new URL(request.url).searchParams)
        return HttpResponse.json({
          items: [ERRO_RASCUNHO, ERRO_PUBLICADO],
          totalCount: 60,
          page: 1,
          pageSize: 25,
          totalPages: 3,
        })
      }),
    )
    return { ultimaLeitura: () => leituras[leituras.length - 1] }
  }

  it('busca, origem, publicação e coluna viram os parâmetros do contrato', async () => {
    const usuario = userEvent.setup()
    const { ultimaLeitura } = criarServidorQueRegistraLeituras()

    renderizarPagina()
    await screen.findByText('E0117')

    await usuario.click(screen.getByRole('button', { name: 'Código' }))
    await usuario.click(screen.getByRole('button', { name: 'Código' }))
    await usuario.click(screen.getByRole('combobox', { name: 'Origem' }))
    await usuario.click(screen.getByRole('option', { name: 'Schema' }))
    await usuario.click(screen.getByRole('radio', { name: 'Rascunhos' }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'cnpj')

    await waitFor(() => expect(ultimaLeitura()?.get('q')).toBe('cnpj'))
    const leitura = ultimaLeitura()
    expect(leitura?.get('origem')).toBe('Schema')
    expect(leitura?.get('publicado')).toBe('false')
    expect(leitura?.get('sortBy')).toBe('codigo')
    expect(leitura?.get('sortDirection')).toBe('desc')
    expect(screen.getByRole('columnheader', { name: /Código/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
  })

  it('trocar um filtro volta para a página 1', async () => {
    const usuario = userEvent.setup()
    const { ultimaLeitura } = criarServidorQueRegistraLeituras()

    renderizarPagina()
    await screen.findByText('E0117')

    await usuario.click(screen.getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(ultimaLeitura()?.get('pagina')).toBe('2'))

    await usuario.click(screen.getByRole('radio', { name: 'Publicados' }))

    await waitFor(() => expect(ultimaLeitura()?.get('publicado')).toBe('true'))
    expect(ultimaLeitura()?.get('pagina')).toBe('1')
  })

  it('sem resultado com filtro, oferece limpar os filtros em vez de dizer que não há erros', async () => {
    const usuario = userEvent.setup()
    server.use(
      handlerProvedoresVazio(),
      http.get(`${API_URL}/interno/erros`, ({ request }) => {
        const filtrado = new URL(request.url).searchParams.has('publicado')
        return HttpResponse.json(paginaDeErros(filtrado ? [] : [ERRO_RASCUNHO]))
      }),
    )

    renderizarPagina()
    await screen.findByText('E0117')
    await usuario.click(screen.getByRole('radio', { name: 'Publicados' }))

    expect(await screen.findByText('Nenhum erro encontrado com estes filtros.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(await screen.findByText('E0117')).toBeInTheDocument()
  })
})

describe('ErrosPage: o foco fica na linha depois de publicar ou despublicar', () => {
  it('despublicar pelo menu com o teclado deixa o foco no botão de mais ações da linha', async () => {
    const usuario = userEvent.setup()
    const { escritas } = criarServidorDeErros([ERRO_PUBLICADO])

    renderizarPagina()
    await screen.findByText('E0118')

    const gatilho = within(linhaDoErro('E0118')).getByRole('button', {
      name: 'Mais ações do erro E0118',
    })
    gatilho.focus()
    await usuario.keyboard('{Enter}')
    expect(screen.getByRole('menuitem', { name: 'Despublicar' })).toHaveFocus()
    await usuario.keyboard('{Enter}')

    expect(await within(linhaDoErro('E0118')).findByText('Rascunho')).toBeInTheDocument()
    expect(escritas).toHaveLength(1)
    expect(document.activeElement).toBe(
      within(linhaDoErro('E0118')).getByRole('button', { name: 'Mais ações do erro E0118' }),
    )
  })

  it('publicar, cujo botão some da linha, devolve o foco ao botão de mais ações', async () => {
    const usuario = userEvent.setup()
    criarServidorDeErros([ERRO_RASCUNHO])

    renderizarPagina()
    await screen.findByText('E0117')
    await usuario.click(within(linhaDoErro('E0117')).getByRole('button', { name: 'Publicar' }))

    const gatilho = await within(linhaDoErro('E0117')).findByRole('button', {
      name: 'Mais ações do erro E0117',
    })
    await waitFor(() => expect(gatilho).toHaveFocus())
  })
})
