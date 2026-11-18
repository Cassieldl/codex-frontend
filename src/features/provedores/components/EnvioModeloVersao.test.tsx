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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../../test/mocks/server'
import { VersaoProvedorPage } from '../routes/versao-provedor'

const API_URL = import.meta.env.VITE_API_URL

const PROVEDOR_SLUG = 'prefeitura-exemplo'
const VERSAO_SLUG = 'v1'
const CAMINHO = `/provedores/${PROVEDOR_SLUG}/${VERSAO_SLUG}`
const URL_DO_ENVIO = `${API_URL}/provedores/${PROVEDOR_SLUG}/versoes/${VERSAO_SLUG}/envio-modelo`

function campo(campoLayoutSlug: string, nome: string, ordem: number) {
  return {
    campoLayoutSlug,
    nome,
    caminhoXml: `//Servico/${nome}`,
    significado: `Significado de ${nome}.`,
    tipo: 'Texto',
    tamanho: null,
    mascara: null,
    dominio: null,
    estadoPreenchimento: 'Obrigatorio',
    condicao: null,
    exemplo: null,
    notaPreenchimento: null,
    destinoXml: null,
    notaTransformacao: null,
    ordem,
    errosConhecidos: [],
  }
}

// JSON literal do envelope de `GET /provedores/{slug}/versoes/{versao}`, sem o tipo do cliente.
const RESPOSTA_DA_VERSAO = {
  data: {
    provedor: {
      slug: PROVEDOR_SLUG,
      nome: 'Prefeitura de Exemplo',
      categoria: 'Proprio',
      identificadorInvoicy: 'EXEMPLO',
    },
    versao: {
      slug: VERSAO_SLUG,
      rotulo: '2.04',
      verificadoEm: '2026-07-01T00:00:00Z',
      introducao: null,
      versaoLayoutRotulo: '8',
    },
    camposPorGrupo: [
      {
        grupo: 'Servico',
        grupoSlug: 'servico',
        campos: [
          campo('servico-discriminacao', 'Discriminacao', 1),
          campo('servico-codigo-cnae', 'CodigoCnae', 2),
        ],
      },
    ],
    totalCampos: 2,
    avisos: [],
    errosResumo: { total: 0, itens: [] },
    exemplos: [],
    outrasVersoes: [],
    naturezasOperacao: [],
  },
  message: null,
}

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

function envioModelo(alcance: 'minimo' | 'maximo', camposSemPosicao: string[] = []) {
  const extras = alcance === 'maximo' ? [no('Observacao', { valorModelo: 'texto(200)' })] : []
  return {
    alcance,
    versaoLayoutRotulo: '8',
    xml: no('Envio', {
      ehGrupo: true,
      filhos: [
        no('Servico', {
          ehGrupo: true,
          filhos: [
            no('Discriminacao', {
              valorModelo: 'texto(1000)',
              campoSlug: 'servico-discriminacao',
            }),
            ...extras,
          ],
        }),
      ],
    }),
    json: no('Documento', {
      ehGrupo: true,
      filhos: [
        no('Discriminacao', { valorModelo: 'texto(1000)', campoSlug: 'servico-discriminacao' }),
        ...extras,
      ],
    }),
    camposSemPosicao,
  }
}

function handlerDaVersao() {
  return http.get(`${API_URL}/provedores/${PROVEDOR_SLUG}/versoes/${VERSAO_SLUG}`, () =>
    HttpResponse.json(RESPOSTA_DA_VERSAO),
  )
}

/** Responde por alcance e conta as buscas de cada um. */
function handlerDoEnvio(camposSemPosicao: string[] = []) {
  const buscas = { minimo: 0, maximo: 0 }
  const handler = http.get(URL_DO_ENVIO, ({ request }) => {
    const alcance = new URL(request.url).searchParams.get('alcance')
    if (alcance !== 'minimo' && alcance !== 'maximo') {
      return HttpResponse.json({ error: { code: 'ALCANCE_INVALIDO' } }, { status: 400 })
    }
    buscas[alcance] += 1
    return HttpResponse.json({ data: envioModelo(alcance, camposSemPosicao), message: null })
  })
  return { handler, buscas }
}

function renderPagina() {
  // O hook decide a retentativa; sem espera entre as tentativas, o teste não depende do relógio.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: CAMINHO,
    component: () => (
      <VersaoProvedorPage
        provedorSlug={PROVEDOR_SLUG}
        versaoSlug={VERSAO_SLUG}
        aba="envio"
        avisosDoProvedor={[]}
      />
    ),
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

function secaoDoEnvio() {
  return screen.getByRole('region', { name: 'Envio modelo' })
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  server.use(handlerDaVersao())
})

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('EnvioModeloVersao: alcance e formato', () => {
  it('abre no mínimo em XML e troca formato e alcance sem repetir busca já feita', async () => {
    const usuario = userEvent.setup()
    const { handler, buscas } = handlerDoEnvio()
    server.use(handler)
    renderPagina()

    const xmlMinimo = await screen.findByRole('region', {
      name: 'Texto do envio modelo mínimo em XML (SOAP)',
    })
    expect(within(xmlMinimo).queryByText(/Observacao/)).not.toBeInTheDocument()
    expect(within(secaoDoEnvio()).getByText(/A prefeitura pode exigir outros campos/)).toBeVisible()
    expect(within(secaoDoEnvio()).getByRole('radio', { name: 'Mínimo' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await usuario.click(within(secaoDoEnvio()).getByRole('radio', { name: 'JSON (REST)' }))
    expect(
      screen.getByRole('region', { name: 'Texto do envio modelo mínimo em JSON (REST)' }),
    ).toBeInTheDocument()
    expect(buscas).toEqual({ minimo: 1, maximo: 0 })

    await usuario.click(within(secaoDoEnvio()).getByRole('radio', { name: 'Máximo' }))
    const jsonMaximo = await screen.findByRole('region', {
      name: 'Texto do envio modelo máximo em JSON (REST)',
    })
    expect(within(jsonMaximo).getByText(/Observacao/)).toBeInTheDocument()

    await usuario.click(within(secaoDoEnvio()).getByRole('radio', { name: 'Mínimo' }))
    expect(
      screen.getByRole('region', { name: 'Texto do envio modelo mínimo em JSON (REST)' }),
    ).toBeInTheDocument()
    expect(buscas).toEqual({ minimo: 1, maximo: 1 })
  })

  it('alcance e formato são grupos de rádio: as setas trocam a escolha e o foco', async () => {
    const usuario = userEvent.setup()
    server.use(handlerDoEnvio().handler)
    renderPagina()

    await screen.findByRole('region', { name: 'Texto do envio modelo mínimo em XML (SOAP)' })
    const alcance = within(secaoDoEnvio()).getByRole('radiogroup', { name: 'Alcance' })
    const minimo = within(alcance).getByRole('radio', { name: 'Mínimo' })
    const maximo = within(alcance).getByRole('radio', { name: 'Máximo' })

    // Só a opção marcada entra no Tab.
    expect(minimo).toHaveAttribute('tabindex', '0')
    expect(maximo).toHaveAttribute('tabindex', '-1')
    expect(minimo).toHaveClass('bg-primary', 'text-white')
    expect(maximo).not.toHaveClass('bg-primary')

    minimo.focus()
    await usuario.keyboard('{ArrowRight}')

    expect(maximo).toHaveAttribute('aria-checked', 'true')
    expect(maximo).toHaveFocus()
    expect(
      await screen.findByRole('region', { name: 'Texto do envio modelo máximo em XML (SOAP)' }),
    ).toBeInTheDocument()

    // Volta na ponta, como o rádio nativo.
    await usuario.keyboard('{ArrowRight}')
    expect(minimo).toHaveAttribute('aria-checked', 'true')
    expect(minimo).toHaveFocus()
  })

  it('abre dizendo o formato, o provedor e a versão, com valores fictícios', async () => {
    const usuario = userEvent.setup()
    server.use(handlerDoEnvio().handler)
    renderPagina()

    await screen.findByRole('region', { name: 'Texto do envio modelo mínimo em XML (SOAP)' })
    expect(
      within(secaoDoEnvio()).getByText(
        'XML de exemplo do Prefeitura de Exemplo 2.04, preenchido com valores fictícios.',
      ),
    ).toBeInTheDocument()

    await usuario.click(within(secaoDoEnvio()).getByRole('radio', { name: 'JSON (REST)' }))
    expect(within(secaoDoEnvio()).getByText(/^JSON de exemplo do/)).toBeInTheDocument()
  })

  it('expandir, recolher, copiar e baixar ficam numa barra só, nessa ordem', async () => {
    server.use(handlerDoEnvio().handler)
    renderPagina()

    await screen.findByRole('region', { name: 'Texto do envio modelo mínimo em XML (SOAP)' })
    const expandir = within(secaoDoEnvio()).getByRole('button', { name: 'Expandir tudo' })
    const barra = expandir.parentElement!

    expect(
      within(barra)
        .getAllByRole('button')
        .map((botao) => botao.textContent),
    ).toEqual(['Expandir tudo', 'Recolher tudo', 'Copiar XML', 'Baixar .xml'])
  })

  it('a legenda segue o desenho da tabela de campos e só explica as marcas do texto', async () => {
    const envio = envioModelo('minimo')
    const xml = {
      ...envio.xml,
      filhos: [...envio.xml.filhos, no('CodigoSoap', { formato: 'soXml', escolha: true })],
    }
    server.use(
      http.get(URL_DO_ENVIO, () => HttpResponse.json({ data: { ...envio, xml }, message: null })),
    )
    renderPagina()

    await screen.findByRole('region', { name: 'Texto do envio modelo mínimo em XML (SOAP)' })
    const legenda = within(secaoDoEnvio()).getByRole('list', { name: 'Legenda:' })

    // O que a tela mostra e o leitor lê: a marca fica com aria-hidden, o significado não.
    expect(
      within(legenda)
        .getAllByRole('listitem')
        .map((item) => item.querySelector(':scope > span:not([aria-hidden])')?.textContent),
    ).toEqual([
      'só no envio XML',
      'informe só uma das tags com esta marca',
      'leva ao campo na tabela desta versão',
    ])
  })

  it('copiar entrega o texto do alcance e do formato à vista', async () => {
    const usuario = userEvent.setup()
    const escrever = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    server.use(handlerDoEnvio().handler)
    renderPagina()

    await screen.findByRole('region', { name: 'Texto do envio modelo mínimo em XML (SOAP)' })
    await usuario.click(within(secaoDoEnvio()).getByRole('radio', { name: 'Máximo' }))
    await screen.findByRole('region', { name: 'Texto do envio modelo máximo em XML (SOAP)' })

    await usuario.click(
      screen.getByRole('button', { name: 'Copiar o envio modelo máximo em XML (SOAP)' }),
    )

    expect(escrever).toHaveBeenCalledWith(
      [
        '<Envio>',
        '  <Servico>',
        '    <Discriminacao>texto(1000)</Discriminacao>',
        '    <Observacao>texto(200)</Observacao>',
        '  </Servico>',
        '</Envio>',
        '',
      ].join('\n'),
    )
  })
})

/** Responde com os cenários pedidos e guarda o cenário de cada busca. */
function handlerComCenarios(cenariosDisponiveis: string[]) {
  const cenariosPedidos: (string | null)[] = []
  const handler = http.get(URL_DO_ENVIO, ({ request }) => {
    const busca = new URL(request.url).searchParams
    const alcance = busca.get('alcance') === 'maximo' ? 'maximo' : 'minimo'
    const cenario = busca.get('cenario')
    cenariosPedidos.push(cenario)
    return HttpResponse.json({
      data: { ...envioModelo(alcance), cenario, cenariosDisponiveis },
      message: null,
    })
  })
  return { handler, cenariosPedidos }
}

describe('EnvioModeloVersao: cenário do tomador', () => {
  it('com tomador estrangeiro disponível, o cenário vira opção e entra na busca', async () => {
    const usuario = userEvent.setup()
    const { handler, cenariosPedidos } = handlerComCenarios([
      'construcao-civil',
      'nacional',
      'tomador-estrangeiro',
    ])
    server.use(handler)
    renderPagina()

    const cenario = await within(
      await screen.findByRole('region', { name: 'Envio modelo' }),
    ).findByRole('combobox', { name: 'Cenário' })
    expect(cenario).toHaveTextContent('Tomador nacional')

    await usuario.click(cenario)
    // Só os cenários que a versão aceita viram opção, na ordem da tela.
    expect(screen.getAllByRole('option').map((opcao) => opcao.textContent)).toEqual([
      'Tomador nacional',
      'Tomador estrangeiro',
      'Construção civil',
    ])
    await usuario.click(screen.getByRole('option', { name: 'Tomador estrangeiro' }))

    expect(
      await screen.findByRole('region', {
        name: 'Texto do envio modelo mínimo, tomador estrangeiro, em XML (SOAP)',
      }),
    ).toBeInTheDocument()
    expect(cenariosPedidos).toEqual(['nacional', 'tomador-estrangeiro'])

    // Com o formato escolhido antes, a troca de alcance mantém cenário e formato.
    await usuario.click(within(secaoDoEnvio()).getByRole('radio', { name: 'JSON (REST)' }))
    await usuario.click(within(secaoDoEnvio()).getByRole('radio', { name: 'Máximo' }))
    expect(within(secaoDoEnvio()).getByRole('combobox', { name: 'Cenário' })).toHaveTextContent(
      'Tomador estrangeiro',
    )
    expect(
      await screen.findByRole('region', {
        name: 'Texto do envio modelo máximo, tomador estrangeiro, em JSON (REST)',
      }),
    ).toBeInTheDocument()
  })

  it('só com o cenário nacional, o seletor de cenário não aparece', async () => {
    server.use(handlerComCenarios(['nacional']).handler)
    renderPagina()

    await screen.findByRole('region', { name: 'Texto do envio modelo mínimo em XML (SOAP)' })
    expect(within(secaoDoEnvio()).queryByRole('combobox', { name: 'Cenário' })).toBeNull()
  })
})

describe('EnvioModeloVersao: destino da tag', () => {
  // A âncora vale na raiz do provedor: a moldura troca para a aba Campos (provedor-layout.test).
  it('a tag do campo aponta para a linha dele na tabela', async () => {
    server.use(handlerDoEnvio().handler)
    renderPagina()

    const regiao = await screen.findByRole('region', {
      name: 'Texto do envio modelo mínimo em XML (SOAP)',
    })
    const link = within(regiao).getByRole('link', { name: 'Discriminacao, ver o campo na tabela' })
    expect(link).toHaveAttribute('href', '#campo-servico-discriminacao')
    // Tag sem campo na tabela fica texto.
    expect(within(regiao).queryByRole('link', { name: /^Servico/ })).not.toBeInTheDocument()
  })

  it('campos sem posição aparecem num aviso, cada um levando à linha da tabela', async () => {
    server.use(handlerDoEnvio(['servico-codigo-cnae', 'campo-fora-da-tabela']).handler)
    renderPagina()

    const aviso = await within(
      await screen.findByRole('region', { name: 'Envio modelo' }),
    ).findByRole('note')
    expect(aviso).toHaveTextContent(/não têm posição no envio modelo/)
    expect(within(aviso).getByRole('link', { name: 'CodigoCnae' })).toHaveAttribute(
      'href',
      '#campo-servico-codigo-cnae',
    )
    // Slug que a tabela não tem não vira link para lugar nenhum.
    expect(within(aviso).getByText('campo-fora-da-tabela')).toBeInTheDocument()
    expect(within(aviso).getAllByRole('link')).toHaveLength(1)
  })

  it('sem campos sem posição, não há aviso', async () => {
    server.use(handlerDoEnvio().handler)
    renderPagina()

    await screen.findByRole('region', { name: 'Texto do envio modelo mínimo em XML (SOAP)' })
    expect(within(secaoDoEnvio()).queryByRole('note')).not.toBeInTheDocument()
  })
})

describe('EnvioModeloVersao: estados', () => {
  it('mostra o carregamento enquanto o envio modelo não chega', async () => {
    let liberar: () => void = () => {}
    const resposta = new Promise<void>((resolver) => {
      liberar = resolver
    })
    server.use(
      http.get(URL_DO_ENVIO, async () => {
        await resposta
        return HttpResponse.json({ data: envioModelo('minimo'), message: null })
      }),
    )
    renderPagina()

    expect(
      await within(await screen.findByRole('region', { name: 'Envio modelo' })).findByText(
        'Carregando o envio modelo…',
      ),
    ).toBeInTheDocument()

    liberar()
    await screen.findByRole('region', { name: 'Texto do envio modelo mínimo em XML (SOAP)' })
    expect(within(secaoDoEnvio()).queryByText('Carregando o envio modelo…')).toBeNull()
  })

  it('erro passageiro oferece tentar de novo, e a nova tentativa mostra o envio', async () => {
    const usuario = userEvent.setup()
    let tentativas = 0
    server.use(
      http.get(URL_DO_ENVIO, () => {
        tentativas += 1
        // A primeira consulta e as duas retentativas do hook falham.
        if (tentativas <= 3) return new HttpResponse(null, { status: 500 })
        return HttpResponse.json({ data: envioModelo('minimo'), message: null })
      }),
    )
    renderPagina()

    const secao = await screen.findByRole('region', { name: 'Envio modelo' })
    await usuario.click(await within(secao).findByRole('button', { name: /tentar novamente/i }))

    expect(
      await screen.findByRole('region', { name: 'Texto do envio modelo mínimo em XML (SOAP)' }),
    ).toBeInTheDocument()
  })

  it('ESTRUTURA_INDISPONIVEL avisa na seção, sem tentar de novo e sem derrubar a página', async () => {
    let tentativas = 0
    server.use(
      http.get(URL_DO_ENVIO, () => {
        tentativas += 1
        return HttpResponse.json(
          { error: { code: 'ESTRUTURA_INDISPONIVEL', message: 'Sem estrutura.' } },
          { status: 404 },
        )
      }),
    )
    renderPagina()

    const secao = await screen.findByRole('region', { name: 'Envio modelo' })
    expect(
      await within(secao).findByText('Envio modelo indisponível para esta versão.'),
    ).toBeInTheDocument()
    expect(within(secao).queryByRole('button', { name: /tentar novamente/i })).toBeNull()
    expect(within(secao).queryByRole('radiogroup')).toBeNull()
    expect(tentativas).toBe(1)
  })
})
