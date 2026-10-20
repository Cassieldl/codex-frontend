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
import { IdVersaoPage } from './idVersao'

const API_URL = import.meta.env.VITE_API_URL

const ID_PROVEDOR = 1
const ID_VERSAO = 5
const ID_VERSAO_LAYOUT = 2
const ID_AVISO = 12

/** Estado do servidor de mentira: publicar troca a flag e avança a versão, como o `xmin` real. */
function criarServidorDeAviso() {
  const aviso = { publicado: true, versaoConcorrencia: 9 }
  const ifMatchRecebidos: (string | null)[] = []

  // JSON transcrito de `VersaoAdminDetalheDto`/`AvisoAdminDto`, sem anotação do tipo do cliente.
  const avisoAtual = () => ({
    id: ID_AVISO,
    escopo: 'Versao',
    provedorId: null,
    versaoProvedorId: ID_VERSAO,
    severidade: 'Alerta',
    titulo: 'ISSRetido passou a ser obrigatório',
    corpo: 'Primeiro parágrafo.',
    vigenciaInicio: '2026-10-05',
    publicado: aviso.publicado,
    camposAfetadosIds: [],
    versaoConcorrencia: aviso.versaoConcorrencia,
  })

  server.use(
    http.get(`${API_URL}/interno/provedores/${ID_PROVEDOR}`, () =>
      HttpResponse.json({
        data: {
          id: ID_PROVEDOR,
          slug: 'prefeitura-de-exemplo',
          nome: 'Prefeitura de Exemplo',
          categoria: 'Nacional',
          identificadorInvoicy: 'PREF-EXEMPLO',
          aliases: [],
          publicado: true,
          avisos: [],
          versaoConcorrencia: 2,
        },
        message: null,
      }),
    ),
    http.get(`${API_URL}/interno/versoes/${ID_VERSAO}`, () =>
      HttpResponse.json({
        data: {
          id: ID_VERSAO,
          provedorId: ID_PROVEDOR,
          versaoLayoutId: ID_VERSAO_LAYOUT,
          rotulo: 'Versão 1',
          introducao: null,
          verificadoEm: null,
          publicado: true,
          avisos: [avisoAtual()],
          versaoConcorrencia: 4,
        },
        message: null,
      }),
    ),
    http.get(`${API_URL}/interno/versoes/${ID_VERSAO}/campos`, () =>
      HttpResponse.json({ data: { campos: [], camposLayoutAusentes: [] }, message: null }),
    ),
    http.get(`${API_URL}/interno/layout/versoes/${ID_VERSAO_LAYOUT}/campos`, () =>
      HttpResponse.json({ data: [], message: null }),
    ),
    http.put(`${API_URL}/interno/avisos/${ID_AVISO}/publicacao`, async ({ request }) => {
      const ifMatch = request.headers.get('If-Match')
      ifMatchRecebidos.push(ifMatch)
      if (ifMatch !== `W/"${aviso.versaoConcorrencia}"`) {
        return HttpResponse.json(
          { error: { code: 'CONFLITO_CONCORRENCIA', message: 'O aviso mudou desde a leitura.' } },
          { status: 409 },
        )
      }

      const corpo = (await request.json()) as { publicado: boolean }
      aviso.publicado = corpo.publicado
      aviso.versaoConcorrencia += 1
      return HttpResponse.json({ data: avisoAtual(), message: null })
    }),
  )

  /** Outro editor salvou o aviso depois da leitura desta tela. */
  function simularEdicaoConcorrente() {
    aviso.versaoConcorrencia += 1
  }

  return { ifMatchRecebidos, simularEdicaoConcorrente }
}

function renderizarPagina() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rotaRaiz = createRootRoute({ component: Outlet })
  const rotaVersao = createRoute({
    getParentRoute: () => rotaRaiz,
    path: '/interno/provedores/$provedorId/versoes/$versaoId',
    component: () => <IdVersaoPage provedorId={ID_PROVEDOR} versaoId={ID_VERSAO} />,
  })
  const router = createRouter({
    routeTree: rotaRaiz.addChildren([rotaVersao]),
    history: createMemoryHistory({
      initialEntries: [`/interno/provedores/${ID_PROVEDOR}/versoes/${ID_VERSAO}`],
    }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  keycloak.tokenParsed = {
    resource_access: { 'codex-backend': { roles: ['versoesprovedor-buscar', 'avisos-publicar'] } },
  }
})

afterEach(() => {
  keycloak.tokenParsed = undefined
})

describe('IdVersaoPage: publicação de aviso', () => {
  it('despublicar e em seguida publicar o mesmo aviso usa o etag novo, e o rótulo acompanha', async () => {
    const { ifMatchRecebidos } = criarServidorDeAviso()
    const usuario = userEvent.setup()
    renderizarPagina()

    const item = (
      await screen.findByRole('heading', { name: 'ISSRetido passou a ser obrigatório' })
    ).parentElement as HTMLElement

    await usuario.click(within(item).getByRole('button', { name: 'Despublicar' }))
    await usuario.click(await within(item).findByRole('button', { name: 'Publicar' }))

    expect(await within(item).findByRole('button', { name: 'Despublicar' })).toBeInTheDocument()
    await waitFor(() => expect(ifMatchRecebidos).toEqual(['W/"9"', 'W/"10"']))
  })

  it('409 ao despublicar mostra a mensagem junto do aviso', async () => {
    const { simularEdicaoConcorrente } = criarServidorDeAviso()
    const usuario = userEvent.setup()
    renderizarPagina()

    const item = (
      await screen.findByRole('heading', { name: 'ISSRetido passou a ser obrigatório' })
    ).parentElement as HTMLElement
    simularEdicaoConcorrente()

    await usuario.click(within(item).getByRole('button', { name: 'Despublicar' }))

    expect(await within(item).findByRole('alert')).toHaveTextContent(
      'O aviso mudou desde a leitura.',
    )
  })
})

describe('IdVersaoPage: trilha', () => {
  it('nenhum dos dois ancestrais da trilha se marca como página atual', async () => {
    criarServidorDeAviso()
    const { container } = renderizarPagina()

    const linkDaLista = await screen.findByRole('link', { name: 'Provedores' })
    const linkDoProvedor = await screen.findByRole('link', { name: 'Prefeitura de Exemplo' })

    expect(linkDaLista).not.toHaveAttribute('aria-current')
    expect(linkDoProvedor).not.toHaveAttribute('aria-current')
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(0)
  })
})

function autenticarCom(roles: string[]) {
  keycloak.tokenParsed = { resource_access: { 'codex-backend': { roles } } }
}

describe('IdVersaoPage: publicação e verificação da versão', () => {
  it('409 ao despublicar mostra a mensagem do servidor', async () => {
    autenticarCom(['versoesprovedor-buscar', 'versoesprovedor-publicar'])
    criarServidorDeAviso()
    server.use(
      http.put(`${API_URL}/interno/versoes/${ID_VERSAO}/publicacao`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONFLITO_CONCORRENCIA',
              message: 'A versão foi alterada por outra requisição. Recarregue e tente novamente.',
            },
          },
          { status: 409 },
        ),
      ),
    )
    const usuario = userEvent.setup()
    renderizarPagina()

    await usuario.click(await screen.findByRole('button', { name: 'Despublicar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A versão foi alterada por outra requisição. Recarregue e tente novamente.',
    )
  })

  it('409 ao confirmar a verificação mostra a mensagem do servidor', async () => {
    autenticarCom(['versoesprovedor-buscar', 'versoesprovedor-atualizar'])
    criarServidorDeAviso()
    server.use(
      http.put(`${API_URL}/interno/versoes/${ID_VERSAO}/verificacao`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONFLITO_CONCORRENCIA',
              message: 'A versão mudou desde a leitura.',
            },
          },
          { status: 409 },
        ),
      ),
    )
    const usuario = userEvent.setup()
    renderizarPagina()

    await usuario.type(await screen.findByLabelText('Marcar como verificado em'), '2026-10-01')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar verificação' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A versão mudou desde a leitura.')
  })
})

describe('IdVersaoPage: edição de campo da versão', () => {
  // JSON transcrito de `CampoVersaoAdminDto`, sem anotação do tipo do cliente.
  const CAMPO_DA_VERSAO = {
    id: 81,
    versaoProvedorId: ID_VERSAO,
    campoLayoutId: 7,
    campoLayoutNome: 'Número da RPS',
    tipo: 'Texto',
    tamanho: null,
    mascara: null,
    dominio: null,
    estadoPreenchimento: 'Obrigatorio',
    condicao: null,
    exemplo: '123',
    notaPreenchimento: null,
    destinoXml: null,
    notaTransformacao: null,
    ordem: 1,
    versaoConcorrencia: 6,
  }

  it('o campo canônico fica só leitura e o PUT vai sem campoLayoutId', async () => {
    autenticarCom(['versoesprovedor-buscar', 'camposversao-atualizar'])
    criarServidorDeAviso()
    const corposRecebidos: unknown[] = []
    server.use(
      http.get(`${API_URL}/interno/versoes/${ID_VERSAO}/campos`, () =>
        HttpResponse.json({
          data: { campos: [CAMPO_DA_VERSAO], camposLayoutAusentes: [] },
          message: null,
        }),
      ),
      http.get(`${API_URL}/interno/layout/versoes/${ID_VERSAO_LAYOUT}/campos`, () =>
        HttpResponse.json({
          data: [
            {
              id: 7,
              nome: 'Número da RPS',
              caminhoXml: '//Rps/Numero',
              significado: 'Número sequencial do RPS.',
              grupo: 'Rps',
              ordem: 1,
              versaoLayoutId: ID_VERSAO_LAYOUT,
              versaoDescontinuacaoId: null,
              publicado: true,
              versaoConcorrencia: 1,
            },
            {
              id: 8,
              nome: 'Data de emissão',
              caminhoXml: '//Rps/DataEmissao',
              significado: 'Data em que o RPS foi emitido.',
              grupo: 'Rps',
              ordem: 2,
              versaoLayoutId: ID_VERSAO_LAYOUT,
              versaoDescontinuacaoId: null,
              publicado: true,
              versaoConcorrencia: 1,
            },
          ],
          message: null,
        }),
      ),
      http.put(`${API_URL}/interno/campos-versao/81`, async ({ request }) => {
        corposRecebidos.push(await request.json())
        return HttpResponse.json({
          data: { ...CAMPO_DA_VERSAO, versaoConcorrencia: 7 },
          message: null,
        })
      }),
    )
    const usuario = userEvent.setup()
    renderizarPagina()

    await usuario.click(await screen.findByRole('button', { name: 'Editar campo Número da RPS' }))

    const campoCanonico = await screen.findByRole('textbox', { name: /Campo canônico/ })
    expect(campoCanonico).toHaveAttribute('readonly')
    expect(campoCanonico).toHaveValue('Número da RPS (//Rps/Numero)')
    expect(screen.queryByRole('combobox', { name: /Campo canônico/ })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(corposRecebidos).toEqual([
        { tipo: 'Texto', estadoPreenchimento: 'Obrigatorio', exemplo: '123', ordem: 1 },
      ]),
    )
  })
})

describe('IdVersaoPage: tabelas da página', () => {
  it('a tabela de campos e a de exemplos são regiões com nomes distintos', async () => {
    autenticarCom(['versoesprovedor-buscar', 'exemplos-buscar'])
    criarServidorDeAviso()
    // JSON transcrito de `CampoVersaoAdminDto` e `ExemploAdminDto`, sem anotação do tipo do cliente.
    server.use(
      http.get(`${API_URL}/interno/versoes/${ID_VERSAO}/campos`, () =>
        HttpResponse.json({
          data: {
            campos: [
              {
                id: 81,
                versaoProvedorId: ID_VERSAO,
                campoLayoutId: 7,
                campoLayoutNome: 'Número da RPS',
                tipo: 'Texto',
                tamanho: null,
                mascara: null,
                dominio: null,
                estadoPreenchimento: 'Obrigatorio',
                condicao: null,
                exemplo: '123',
                notaPreenchimento: null,
                destinoXml: null,
                notaTransformacao: null,
                ordem: 1,
                versaoConcorrencia: 6,
              },
            ],
            camposLayoutAusentes: [],
          },
          message: null,
        }),
      ),
      http.get(`${API_URL}/interno/versoes/${ID_VERSAO}/exemplos`, () =>
        HttpResponse.json({
          data: [
            {
              id: 3,
              versaoProvedorId: ID_VERSAO,
              slug: 'iss-retido',
              nome: 'ISS retido',
              descricao: null,
              xml: '<Rps />',
              versaoConcorrencia: 1,
            },
          ],
          message: null,
        }),
      ),
    )
    renderizarPagina()

    expect(await screen.findByRole('region', { name: 'Campos desta versão' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Exemplos desta versão' })).toBeInTheDocument()

    const nomes = screen.getAllByRole('region').map((regiao) => regiao.getAttribute('aria-label'))
    expect(new Set(nomes).size).toBe(nomes.length)
  })
})
