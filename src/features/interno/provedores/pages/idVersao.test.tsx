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
import { versaoSearchSchema, type AbaDaVersao } from '../types/abaDaVersao'
import { IdVersaoPage } from './idVersao'
import { MENSAGEM_DE_CONFLITO } from '../../utils/mensagemDeErroDeEscrita'

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

function renderizarPagina(aba?: AbaDaVersao) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rotaRaiz = createRootRoute({ component: Outlet })
  const rotaVersao = createRoute({
    getParentRoute: () => rotaRaiz,
    path: '/interno/provedores/$provedorId/versoes/$versaoId',
    validateSearch: versaoSearchSchema,
    component: function PaginaComAba() {
      const { aba: abaDaUrl } = rotaVersao.useSearch()
      return <IdVersaoPage provedorId={ID_PROVEDOR} versaoId={ID_VERSAO} aba={abaDaUrl} />
    },
  })
  const caminho = `/interno/provedores/${ID_PROVEDOR}/versoes/${ID_VERSAO}`
  const router = createRouter({
    routeTree: rotaRaiz.addChildren([rotaVersao]),
    history: createMemoryHistory({ initialEntries: [aba ? `${caminho}?aba=${aba}` : caminho] }),
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

/** O aviso nasce recolhido: abre pelo cabeçalho e devolve o item inteiro da lista. */
async function abrirAviso(usuario: ReturnType<typeof userEvent.setup>) {
  const cabecalho = await screen.findByRole('button', {
    name: /ISSRetido passou a ser obrigatório/,
  })
  await usuario.click(cabecalho)
  return cabecalho.closest('li') as HTMLElement
}

describe('IdVersaoPage: publicação de aviso', () => {
  it('despublicar e em seguida publicar o mesmo aviso usa o etag novo, e o rótulo acompanha', async () => {
    const { ifMatchRecebidos } = criarServidorDeAviso()
    const usuario = userEvent.setup()
    renderizarPagina()

    const item = await abrirAviso(usuario)

    await usuario.click(within(item).getByRole('button', { name: 'Despublicar' }))
    await usuario.click(await within(item).findByRole('button', { name: 'Publicar' }))

    expect(await within(item).findByRole('button', { name: 'Despublicar' })).toBeInTheDocument()
    await waitFor(() => expect(ifMatchRecebidos).toEqual(['W/"9"', 'W/"10"']))
  })

  it('409 ao despublicar mostra a mensagem junto do aviso', async () => {
    const { simularEdicaoConcorrente } = criarServidorDeAviso()
    const usuario = userEvent.setup()
    renderizarPagina()

    const item = await abrirAviso(usuario)
    simularEdicaoConcorrente()

    await usuario.click(within(item).getByRole('button', { name: 'Despublicar' }))

    expect(await within(item).findByRole('alert')).toHaveTextContent(MENSAGEM_DE_CONFLITO.acao)
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
    // A única página atual é a aba aberta, nunca um ponto da trilha.
    const atuais = Array.from(container.querySelectorAll('[aria-current="page"]'))
    expect(atuais).toHaveLength(1)
    expect(atuais[0].closest('nav')).toHaveAccessibleName('Seções da versão')
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

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_DE_CONFLITO.acao)
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
    renderizarPagina('verificacao')

    await usuario.type(await screen.findByLabelText('Marcar como verificado em'), '2026-10-01')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar verificação' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_DE_CONFLITO.acao)
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
    renderizarPagina('campos')

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

/** Um campo, dois exemplos: contagens diferentes para o contador de cada aba ser distinguível. */
function servirCamposEExemplos() {
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
          {
            id: 4,
            versaoProvedorId: ID_VERSAO,
            slug: 'tomador-exterior',
            nome: 'Tomador no exterior',
            descricao: null,
            xml: '<Rps />',
            versaoConcorrencia: 1,
          },
        ],
        message: null,
      }),
    ),
  )
}

function abaPorRotulo(rotulo: string) {
  const navegacao = screen.getByRole('navigation', { name: 'Seções da versão' })
  return within(navegacao).getByRole('link', { name: new RegExp(`^${rotulo}`) })
}

describe('IdVersaoPage: abas da versão', () => {
  it('abre na aba de avisos e mostra só o conteúdo dela', async () => {
    autenticarCom(['versoesprovedor-buscar', 'exemplos-buscar'])
    criarServidorDeAviso()
    servirCamposEExemplos()
    renderizarPagina()

    expect(await screen.findByRole('heading', { name: 'Avisos desta versão' })).toBeInTheDocument()
    expect(abaPorRotulo('Avisos')).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('region', { name: 'Campos desta versão' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Exemplos desta versão' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Marcar como verificado em')).not.toBeInTheDocument()
  })

  it('o aviso nasce recolhido: severidade, título e estado à vista, corpo escondido', async () => {
    criarServidorDeAviso()
    const usuario = userEvent.setup()
    renderizarPagina()

    const cabecalho = await screen.findByRole('button', {
      name: /ISSRetido passou a ser obrigatório/,
    })
    expect(cabecalho).toHaveAttribute('aria-expanded', 'false')
    expect(cabecalho).toHaveTextContent('Alerta')
    expect(cabecalho).toHaveTextContent('Publicado')
    expect(screen.getByText('Primeiro parágrafo.')).not.toBeVisible()

    await usuario.click(cabecalho)

    expect(cabecalho).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText('Primeiro parágrafo.')).toBeVisible()
  })

  it('?aba= abre direto na aba pedida', async () => {
    autenticarCom(['versoesprovedor-buscar', 'exemplos-buscar'])
    criarServidorDeAviso()
    servirCamposEExemplos()
    renderizarPagina('exemplos')

    expect(await screen.findByRole('region', { name: 'Exemplos desta versão' })).toBeInTheDocument()
    expect(abaPorRotulo('Exemplos')).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('heading', { name: 'Avisos desta versão' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Campos desta versão' })).not.toBeInTheDocument()
  })

  it('o contador de cada aba é o número de itens dela', async () => {
    autenticarCom(['versoesprovedor-buscar', 'exemplos-buscar'])
    criarServidorDeAviso()
    servirCamposEExemplos()
    renderizarPagina()

    await waitFor(() => expect(abaPorRotulo('Exemplos')).toHaveTextContent('Exemplos2'))
    await waitFor(() => expect(abaPorRotulo('Campos')).toHaveTextContent('Campos1'))
    expect(abaPorRotulo('Avisos')).toHaveTextContent('Avisos1')
    expect(abaPorRotulo('Verificação')).toHaveTextContent(/^Verificação$/)
  })

  it('seta move o foco entre as abas e Enter abre a aba focada, que entra na URL', async () => {
    autenticarCom(['versoesprovedor-buscar', 'exemplos-buscar'])
    criarServidorDeAviso()
    servirCamposEExemplos()
    const usuario = userEvent.setup()
    renderizarPagina()

    await screen.findByRole('heading', { name: 'Avisos desta versão' })
    abaPorRotulo('Avisos').focus()

    await usuario.keyboard('{ArrowRight}')
    expect(abaPorRotulo('Campos')).toHaveFocus()

    await usuario.keyboard('{Enter}')

    expect(await screen.findByRole('region', { name: 'Campos desta versão' })).toBeInTheDocument()
    expect(abaPorRotulo('Campos')).toHaveAttribute('aria-current', 'page')
    expect(abaPorRotulo('Campos').getAttribute('href')).toContain('aba=campos')

    await usuario.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(abaPorRotulo('Verificação')).toHaveFocus()
  })
})
