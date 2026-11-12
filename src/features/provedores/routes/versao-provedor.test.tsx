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
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../../test/mocks/server'
import { VersaoProvedorPage } from './versao-provedor'

const API_URL = import.meta.env.VITE_API_URL

const PROVEDOR_SLUG = 'prefeitura-exemplo'
const VERSAO_SLUG = 'v1'
const CAMINHO = `/provedores/${PROVEDOR_SLUG}`

interface OpcoesRender {
  /**
   * Deixa a política de retentativa do hook valer. O padrão é `retry: false`,
   * que serve aos testes de conteúdo mas **mascara** o que o hook decide.
   */
  usarRetentativaDoHook?: boolean
}

function renderPagina({ usarRetentativaDoHook = false }: OpcoesRender = {}) {
  const queryClient = new QueryClient({
    defaultOptions: usarRetentativaDoHook
      ? { queries: { retryDelay: 0 } }
      : { queries: { retry: false } },
  })

  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: CAMINHO,
    component: () => <VersaoProvedorPage provedorSlug={PROVEDOR_SLUG} versaoSlug={VERSAO_SLUG} />,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: [CAMINHO] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function handlerStatus(status: number, corpo?: unknown) {
  return http.get(`${API_URL}/provedores/${PROVEDOR_SLUG}/versoes/${VERSAO_SLUG}`, () =>
    corpo === undefined ? new HttpResponse(null, { status }) : HttpResponse.json(corpo, { status }),
  )
}

/**
 * O hook classifica quatro tipos por status; a tela tratava um. `nao_encontrado`
 * (404) e `limite_excedido` (422) caíam no `ErrorState` — "Não foi possível
 * carregar esta informação agora. / Tentar novamente" —, que promete que
 * insistir resolve. Nenhum dos dois melhora por insistência.
 *
 * A ausência do botão de nova tentativa é o que prova que o caso saiu do balde
 * genérico; só o título passaria se o `ErrorState` fosse renderizado junto.
 */
describe('VersaoProvedorPage — respostas definitivas', () => {
  it('404 explica que a versão não existe, sem oferecer nova tentativa', async () => {
    server.use(handlerStatus(404))

    renderPagina()

    await screen.findByRole('heading', { level: 1, name: 'Esta versão não existe.' })
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument()
  })

  it('410 explica que a versão saiu do ar, sem oferecer nova tentativa', async () => {
    server.use(handlerStatus(410, { error: { code: 'VERSAO_DESPUBLICADA' } }))

    renderPagina()

    await screen.findByRole('heading', { level: 1, name: 'Esta versão saiu do ar.' })
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument()
  })

  it('410 do provedor ancestral também explica, em vez de cair no erro genérico', async () => {
    server.use(handlerStatus(410, { error: { code: 'PROVEDOR_DESPUBLICADO' } }))

    renderPagina()

    await screen.findByRole('heading', { level: 1, name: 'Esta versão saiu do ar.' })
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument()
  })

  it('422 diz que a versão é grande demais, sem oferecer nova tentativa', async () => {
    server.use(handlerStatus(422))

    renderPagina()

    await screen.findByRole('heading', {
      level: 1,
      name: 'Esta versão é grande demais para abrir aqui.',
    })
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument()
  })

  // O contraponto: 5xx pode melhorar sozinho. Sem este caso, trocar o
  // `ErrorState` por uma tela de "não existe" em tudo passaria despercebido.
  it('500 continua oferecendo nova tentativa', async () => {
    server.use(handlerStatus(500))

    renderPagina()

    expect(await screen.findByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
    expect(screen.queryByText('Esta versão não existe.')).not.toBeInTheDocument()
  })

  // A página do provedor é a própria que falhou: voltar para ela seria um laço.
  it('toda resposta definitiva oferece a saída para a lista de provedores', async () => {
    server.use(handlerStatus(404))

    renderPagina()

    const saida = await screen.findByRole('link', { name: 'Ver todos os provedores' })
    expect(saida).toHaveAttribute('href', '/provedores?pagina=1')
  })
})

describe('VersaoProvedorPage — retentativa só no que pode melhorar', () => {
  function handlerContado(status: number) {
    let chamadas = 0
    const handler = http.get(
      `${API_URL}/provedores/${PROVEDOR_SLUG}/versoes/${VERSAO_SLUG}`,
      () => {
        chamadas += 1
        return new HttpResponse(null, { status })
      },
    )

    return { handler, contar: () => chamadas }
  }

  it('não repete a requisição quando a versão não existe', async () => {
    const { handler, contar } = handlerContado(404)
    server.use(handler)

    renderPagina({ usarRetentativaDoHook: true })

    await screen.findByRole('heading', { level: 1, name: 'Esta versão não existe.' })
    expect(contar()).toBe(1)
  })

  it('repete a requisição quando o erro pode ser passageiro', async () => {
    const { handler, contar } = handlerContado(500)
    server.use(handler)

    renderPagina({ usarRetentativaDoHook: true })

    await screen.findByRole('button', { name: /tentar novamente/i })
    expect(contar()).toBeGreaterThan(1)
  })
})

/**
 * Resposta transcrita do envelope real de `GET /provedores/{slug}/versoes/{versao}` (campos e erros
 * do Emissor Nacional 0.20), **sem anotação do tipo do cliente**. O campo `PaiPreServico` tem duas
 * rejeições; `E1235` não está ligado a campo nenhum — é ele que a lista perderia se o contador
 * voltasse a recortá-la.
 */
const RESPOSTA_DA_VERSAO = {
  data: {
    provedor: {
      slug: PROVEDOR_SLUG,
      nome: 'Prefeitura de Exemplo',
      categoria: 'Nacional',
      identificadorInvoicy: 'prefeitura-exemplo',
    },
    versao: {
      slug: VERSAO_SLUG,
      rotulo: '0.20',
      verificadoEm: '2026-07-01T00:00:00Z',
      introducao: null,
      versaoLayoutRotulo: '1.0',
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
            ordem: 148,
            errosConhecidos: [],
          },
          {
            campoLayoutSlug: 'servico-paipreservico',
            nome: 'PaiPreServico',
            caminhoXml: '//Servico/PaiPreServico',
            significado: 'País de prestação do serviço.',
            tipo: 'Texto',
            tamanho: '2',
            mascara: null,
            dominio: null,
            estadoPreenchimento: 'Condicional',
            condicao: 'Informar apenas um entre: cLocPrestacao, cPaisPrestacao.',
            exemplo: null,
            notaPreenchimento: null,
            destinoXml: 'DPS/infDPS/serv/locPrest/cPaisPrestacao',
            notaTransformacao: null,
            ordem: 150,
            errosConhecidos: [
              { slug: 'e0304-informe-um-codigo-de-pais-existente', codigo: 'E0304' },
              { slug: 'e0590-e-obrigatorio-informar-o-codigo-do-pais', codigo: 'E0590' },
            ],
          },
        ],
      },
    ],
    totalCampos: 2,
    avisos: [],
    errosResumo: {
      total: 3,
      itens: [
        {
          slug: 'e0304-informe-um-codigo-de-pais-existente',
          codigo: 'E0304',
          titulo: 'Informe um código de país existente.',
          variantes: ['Informe um código de país existente.'],
        },
        {
          slug: 'e0590-e-obrigatorio-informar-o-codigo-do-pais',
          codigo: 'E0590',
          titulo: 'É obrigatório informar o código do país.',
          variantes: ['É obrigatório informar o código do país.'],
        },
        {
          slug: 'e1235-falha-no-esquema',
          codigo: 'E1235',
          titulo: 'Falha no esquema XML da DPS',
          variantes: [],
        },
      ],
    },
    exemplos: [],
    outrasVersoes: [],
    naturezasOperacao: [],
  },
  message: null,
}

describe('VersaoProvedorPage — campos da versão', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    server.use(handlerStatus(200, RESPOSTA_DA_VERSAO))
  })

  function linksDaListaDeErros() {
    const secao = document.getElementById('erros-conhecidos')!
    return within(secao).getAllByRole('link')
  }

  it('monta a seção de campos com o primeiro bloco aberto', async () => {
    renderPagina()

    await screen.findByRole('heading', { level: 2, name: 'Campos e mapeamento' })

    expect(screen.getByRole('heading', { level: 3, name: 'Serviço' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PaiPreServico' })).toBeInTheDocument()
  })

  it('o contador de rejeições abre o modal do campo e a lista de erros continua inteira', async () => {
    const usuario = userEvent.setup()
    renderPagina()
    await screen.findByRole('heading', { level: 2, name: 'Campos e mapeamento' })
    expect(linksDaListaDeErros()).toHaveLength(3)

    await usuario.click(
      screen.getByRole('button', { name: 'Ver as 2 rejeições registradas no campo PaiPreServico' }),
    )

    expect(await screen.findByRole('dialog', { name: 'PaiPreServico' })).toBeInTheDocument()
    expect(linksDaListaDeErros()).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Remover o filtro do campo/ })).toBeNull()
  })
})

describe('VersaoProvedorPage: seções da versão', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  const RESPOSTA_COM_NATUREZA = {
    ...RESPOSTA_DA_VERSAO,
    data: {
      ...RESPOSTA_DA_VERSAO.data,
      naturezasOperacao: [
        {
          codigoInvoicy: 9,
          descricao: 'Exportação de serviço',
          valorProvedor: '3',
          observacao: null,
          aConfirmar: false,
        },
      ],
    },
  }

  it('mostra o de-para da natureza da operação que a API entrega', async () => {
    server.use(handlerStatus(200, RESPOSTA_COM_NATUREZA))

    renderPagina()

    const secao = await screen.findByRole('region', { name: 'Natureza da operação' })
    expect(within(secao).getByRole('cell', { name: 'Exportação de serviço' })).toBeInTheDocument()
  })

  // Os erros sobem porque são consulta rápida; Campos, a referência longa, vem depois deles.
  it('ordena erros conhecidos, campos, natureza da operação e envio modelo', async () => {
    server.use(handlerStatus(200, RESPOSTA_COM_NATUREZA))

    renderPagina()

    await screen.findByRole('region', { name: 'Natureza da operação' })
    const titulos = screen
      .getAllByRole('heading', { level: 2 })
      .map((titulo) => titulo.textContent ?? '')
      .filter((texto) => /^(Erros conhecidos|Campos|Natureza|Envio modelo)/.test(texto))

    expect(titulos).toEqual([
      'Erros conhecidos (3)',
      'Campos e mapeamento',
      'Natureza da operação',
      'Envio modelo',
    ])
  })
})

describe('VersaoProvedorPage: título da aba', () => {
  it('nomeia a aba só com o provedor, sem a versão', async () => {
    server.use(handlerStatus(200, RESPOSTA_DA_VERSAO))
    Element.prototype.scrollIntoView = vi.fn()
    renderPagina()

    await screen.findByRole('heading', { level: 2, name: 'Campos e mapeamento' })
    expect(document.title).toBe('Prefeitura de Exemplo | Codex')
  })

  it('versão inexistente nomeia a aba pelo desfecho', async () => {
    server.use(handlerStatus(404))
    renderPagina()

    await screen.findByRole('heading', { level: 1, name: 'Esta versão não existe.' })
    expect(document.title).toBe('Versão não encontrada | Codex')
  })
})
