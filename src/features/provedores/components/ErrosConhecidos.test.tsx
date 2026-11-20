import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import { mensagensQueAcrescentam } from './camposDosErrosConhecidos'
import { ErrosConhecidos } from './ErrosConhecidos'

/**
 * Transcrito do `ErroResumoPublicoDto` real, **sem anotação do tipo do cliente**: anotar faria o
 * compilador moldar o mock à crença do cliente, e o teste passaria a conferir a si mesmo.
 */
const ERRO_COM_MENSAGEM_PROPRIA = {
  codigo: 'E0248',
  titulo: 'CNPJ do intermediário inválido',
  slug: 'e0248-cnpj-do-intermediario-invalido',
  variantes: ['O CNPJ informado para o intermediário não é válido.'],
}

const ERRO_COM_MENSAGEM_IGUAL = {
  codigo: 'E0953',
  titulo: 'O valor reembolso deve ser menor ou igual ao valor do serviço prestado.',
  slug: 'e0953-o-valor-reembolso',
  variantes: ['O valor reembolso deve ser menor ou igual ao valor do serviço prestado.'],
}

const ERRO_SEM_CAMPO = {
  codigo: 'E1235',
  titulo: 'Falha no esquema XML da DPS',
  slug: 'e1235-falha-no-esquema',
  variantes: [],
}

function campo(
  nome: string,
  campoLayoutSlug: string,
  errosConhecidos: { slug: string; codigo: string }[],
) {
  return {
    campoLayoutSlug,
    nome,
    caminhoXml: `//IntermServico/${nome}`,
    significado: `Significado de ${nome}`,
    reformaTributaria: false,
    tipo: 'Texto',
    tamanho: '14',
    mascara: null,
    dominio: null,
    estadoPreenchimento: 'Condicional' as const,
    condicao: null,
    exemplo: null,
    notaPreenchimento: null,
    destinoXml: null,
    notaTransformacao: null,
    ordem: 1,
    errosConhecidos,
  }
}

const CAMPOS_POR_GRUPO = [
  {
    grupo: 'IntermServico',
    grupoSlug: 'intermservico',
    campos: [
      campo('IntermCNPJ', 'intermservico-intermcnpj', [
        { slug: ERRO_COM_MENSAGEM_PROPRIA.slug, codigo: 'E0248' },
      ]),
      campo('IntermRazaoSocial', 'intermservico-intermrazaosocial', [
        { slug: ERRO_COM_MENSAGEM_IGUAL.slug, codigo: 'E0953' },
      ]),
    ],
  },
]

const RESUMO = {
  total: 3,
  itens: [ERRO_COM_MENSAGEM_PROPRIA, ERRO_COM_MENSAGEM_IGUAL, ERRO_SEM_CAMPO],
}

function renderizar(
  props: Partial<Parameters<typeof ErrosConhecidos>[0]> = {},
  resumo: typeof RESUMO = RESUMO,
) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <ErrosConhecidos
        resumo={resumo}
        provedorSlug="prefeitura-exemplo"
        camposPorGrupo={CAMPOS_POR_GRUPO}
        {...props}
      />
    ),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function itensDaLista() {
  return within(screen.getAllByRole('list')[0])
    .getAllByRole('listitem')
    .filter((item) => item.querySelector('button[aria-expanded]'))
}

describe('mensagensQueAcrescentam', () => {
  it('descarta a mensagem que só repete o título, mesmo com o ponto final', () => {
    expect(
      mensagensQueAcrescentam({
        ...ERRO_COM_MENSAGEM_IGUAL,
        titulo: 'O valor reembolso deve ser menor ou igual ao valor do serviço prestado',
      }),
    ).toEqual([])
    expect(mensagensQueAcrescentam(ERRO_COM_MENSAGEM_PROPRIA)).toEqual(
      ERRO_COM_MENSAGEM_PROPRIA.variantes,
    )
  })
})

describe('ErrosConhecidos: cada erro', () => {
  it('abre a linha com a correção, o link do erro e o campo na tabela', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/erros/:slug`, () =>
        HttpResponse.json({
          data: { ...ERRO_COM_MENSAGEM_PROPRIA, solucaoSugerida: 'Confira o dígito verificador.' },
          message: null,
        }),
      ),
    )
    renderizar()

    const linha = await screen.findByRole('button', {
      name: /E0248\s*CNPJ do intermediário inválido/,
    })
    expect(linha).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(linha)

    expect(linha).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText('Confira o dígito verificador.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir a página do erro' })).toHaveAttribute(
      'href',
      `/erros/${ERRO_COM_MENSAGEM_PROPRIA.slug}`,
    )
    expect(screen.getByRole('link', { name: 'Ver IntermCNPJ na tabela' })).toHaveAttribute(
      'href',
      '/provedores/prefeitura-exemplo/campos#campo-intermservico-intermcnpj',
    )
  })

  it('erro com campo mostra o que você envia e as rejeições do campo; erro sem campo, não', async () => {
    const camposComDestino = [
      {
        grupo: 'IntermServico',
        grupoSlug: 'intermservico',
        campos: [
          {
            ...campo('IntermCNPJ', 'intermservico-intermcnpj', [
              { slug: ERRO_COM_MENSAGEM_PROPRIA.slug, codigo: 'E0248' },
              { slug: 'e0249-cnpj-do-intermediario-ausente', codigo: 'E0249' },
            ]),
            destinoXml: 'DPS/infDPS/interm/CNPJ',
          },
        ],
      },
    ]
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/erros/:slug`, () =>
        HttpResponse.json({ data: { ...ERRO_SEM_CAMPO, solucaoSugerida: null }, message: null }),
      ),
    )
    renderizar({ camposPorGrupo: camposComDestino })

    fireEvent.click(await screen.findByRole('button', { name: /E0248/ }))

    const voceEnvia = screen.getByText('Você envia').parentElement!
    expect(voceEnvia).toHaveTextContent('IntermCNPJ → tag CNPJ')
    expect(within(voceEnvia).getByRole('link', { name: 'IntermCNPJ' })).toHaveAttribute(
      'href',
      '/provedores/prefeitura-exemplo/campos#campo-intermservico-intermcnpj',
    )
    expect(screen.getByText('Rejeições nesta versão').parentElement).toHaveTextContent(
      '2 erros conhecidos',
    )

    fireEvent.click(screen.getByRole('button', { name: /E1235/ }))

    await screen.findByText('Precisa de ajuda com este erro? Fale com o suporte.')
    expect(screen.queryByText('Você envia')).not.toBeInTheDocument()
    expect(screen.queryByText('Rejeições nesta versão')).not.toBeInTheDocument()
  })

  it('erro sem correção esconde "Como corrigir" e aponta o suporte, sem inventar uma', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/erros/:slug`, () =>
        HttpResponse.json({ data: { ...ERRO_SEM_CAMPO, solucaoSugerida: null }, message: null }),
      ),
    )
    renderizar()

    fireEvent.click(await screen.findByRole('button', { name: /E1235/ }))

    expect(
      await screen.findByText('Precisa de ajuda com este erro? Fale com o suporte.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Como corrigir' })).not.toBeInTheDocument()
  })

  it('mostra a mensagem observada só quando ela diz algo além do título', async () => {
    renderizar()
    await screen.findByText(ERRO_COM_MENSAGEM_PROPRIA.titulo)

    expect(screen.getByText(ERRO_COM_MENSAGEM_PROPRIA.variantes[0])).toBeInTheDocument()
    expect(screen.getAllByText(ERRO_COM_MENSAGEM_IGUAL.titulo)).toHaveLength(1)
  })

  it('diz o campo relacionado; erro sem campo não ganha a linha', async () => {
    renderizar()

    const linha = (await screen.findByText(ERRO_COM_MENSAGEM_PROPRIA.titulo)).closest('button')!
    expect(linha).toHaveTextContent('Campo: IntermCNPJ')
    expect(screen.getByText(ERRO_SEM_CAMPO.titulo).closest('button')).not.toHaveTextContent('Campo')
  })

  it('título cortado em "…" vira a mensagem inteira, que não se repete embaixo', async () => {
    const mensagemInteira =
      'Não é permitido informar alíquota quando não há indicação de retenção do ISSQN (tpRetISSQN = 1) para o prestador de serviço ME/EPP (opSimpNac = 3) na data de competência informada na DPS.'
    renderizar(
      {},
      {
        total: 1,
        itens: [
          {
            codigo: 'E0625',
            titulo:
              'Não é permitido informar alíquota quando não há indicação de retenção do ISSQN (tpRetISSQN = 1) para o prestador de serviço ME/EPP (opSimpNac = 3) na data de…',
            slug: 'e0625-nao-e-permitido',
            variantes: [mensagemInteira],
          },
        ],
      },
    )

    expect(await screen.findByText(mensagemInteira)).toBeInTheDocument()
    expect(screen.getAllByText(/Não é permitido informar alíquota/)).toHaveLength(1)
    expect(screen.queryByText(/na data de…/)).not.toBeInTheDocument()
  })

  // O prefixo fixo `/erros/` já mantém o destino na mesma origem; o que este caso prova é o ramo
  // de texto quando o saneador recusa o slug (caractere de controle).
  it('slug recusado pelo saneador abre sem o link para a página do erro', async () => {
    const titulo = 'Título do erro com slug perigoso'
    renderizar({}, { total: 1, itens: [{ ...ERRO_SEM_CAMPO, slug: 'e0001\t//evil.com', titulo }] })

    fireEvent.click(await screen.findByRole('button', { name: new RegExp(titulo) }))

    expect(screen.queryByRole('link', { name: 'Abrir a página do erro' })).not.toBeInTheDocument()
  })
})

describe('ErrosConhecidos: busca', () => {
  async function buscar(termo: string) {
    renderizar()
    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: termo } })
  }

  it('filtra pelo código', async () => {
    await buscar('e1235')
    expect(itensDaLista().map((item) => item.textContent)).toEqual([
      expect.stringContaining('E1235'),
    ])
  })

  it('filtra pelo texto, sem depender de acento', async () => {
    await buscar('intermediario')
    expect(itensDaLista()).toHaveLength(1)
    expect(itensDaLista()[0]).toHaveTextContent('E0248')
  })

  it('filtra pelo nome do campo relacionado', async () => {
    await buscar('IntermRazaoSocial')
    expect(itensDaLista()).toHaveLength(1)
    expect(itensDaLista()[0]).toHaveTextContent('E0953')
  })

  it('sem resultado, diz isso e oferece limpar', async () => {
    await buscar('nada-com-isso')

    expect(screen.getByText('Nenhum erro encontrado para esse filtro.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(itensDaLista()).toHaveLength(3)
  })
})

describe('ErrosConhecidos: ordem e paginação', () => {
  // Fora de ordem de propósito, e com códigos de tamanhos diferentes: E2 tem de vir antes de E10.
  const SESSENTA = {
    total: 60,
    itens: Array.from({ length: 60 }, (_, indice) => {
      const numero = 60 - indice
      return {
        codigo: `E${numero}`,
        titulo: `Erro número ${numero}`,
        slug: `e${numero}-erro`,
        variantes: [],
      }
    }),
  }

  function codigosNaTela() {
    return itensDaLista().map((item) => item.textContent?.match(/^E\d+/)?.[0])
  }

  // Literais, não a constante: 25 é decisão de produto, e o teste tem de cair se ela mudar.
  it('abre em ordem crescente de código, 25 por página, com o total à vista', async () => {
    renderizar({}, SESSENTA)
    await screen.findByText('Erro número 1')

    expect(codigosNaTela().slice(0, 3)).toEqual(['E1', 'E2', 'E3'])
    expect(itensDaLista()).toHaveLength(25)
    expect(screen.getByText('60 registros')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Página 3' }))

    expect(codigosNaTela()).toEqual(Array.from({ length: 10 }, (_, indice) => `E${51 + indice}`))
  })

  it('filtrar volta para a página 1', async () => {
    renderizar({}, SESSENTA)
    await screen.findByText('Erro número 1')

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    // O termo casa com todos: sem voltar para a 1, a lista ficaria na página 2.
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'numero' } })

    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
    expect(codigosNaTela()[0]).toBe('E1')
  })
})

describe('ErrosConhecidos: vazio', () => {
  it('não renderiza a seção quando a versão não tem erro', () => {
    const { container } = render(
      <ErrosConhecidos
        resumo={{ total: 0, itens: [] }}
        provedorSlug="prefeitura-exemplo"
        camposPorGrupo={CAMPOS_POR_GRUPO}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
