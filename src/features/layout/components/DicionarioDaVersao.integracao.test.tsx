import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../../test/mocks/server'
import { useCampoDestacadoPorAncora } from '../../provedores/utils/destaqueAncora'
import { DicionarioDaVersao } from './DicionarioDaVersao'

/**
 * Dicionário real, modal real e consulta real (MSW) sob roteador - o que os testes de
 * `DicionarioDaVersao` (modal falso) não enxergam: a devolução do foco depois do fechamento, a
 * âncora na URL, o atraso da consulta ao navegar e o que acontece ao seguir "Ver no provedor".
 * Registros transcritos da resposta da API (versão 8), sem anotação com o tipo do cliente.
 */
const API_URL = import.meta.env.VITE_API_URL

const ORIGEM = 'https://codex.migrate.info'

const DISCRIMINACAO = {
  slug: 'servico-discriminacao',
  nome: 'Discriminacao',
  caminhoXml: '//Servico/Discriminacao',
  significado: 'Discriminação dos serviços realizados.',
  ordem: 148,
  reformaTributaria: false,
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
  // Diferente de `/layout/campos/{slug}`: se o link for montado à mão, o valor copiado muda.
  urlCanonica: '/layout/campos/servico-discriminacao-canonico',
}

const PAI_PRE_SERVICO = {
  slug: 'servico-paipreservico',
  nome: 'PaiPreServico',
  caminhoXml: '//Servico/PaiPreServico',
  significado: 'País de prestação do serviço.',
  ordem: 150,
  reformaTributaria: false,
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/servico-paipreservico',
}

const TOMA_CNPJ = {
  slug: 'tomador-tomacnpj',
  nome: 'TomaCNPJ',
  caminhoXml: '//Tomador/TomaCNPJ',
  significado: 'CNPJ do tomador.',
  ordem: 330,
  reformaTributaria: false,
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/tomador-tomacnpj',
}

const CNPJ_PRESTADOR = {
  slug: 'prestador-cnpj-prest',
  nome: 'CNPJ_prest',
  caminhoXml: '//Prestador/CNPJ_prest',
  significado: 'CNPJ do prestador.',
  ordem: 44,
  reformaTributaria: false,
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/prestador-cnpj-prest',
}

const CAMPOS_POR_GRUPO = [
  { grupo: 'Servico', grupoSlug: 'servico', campos: [DISCRIMINACAO, PAI_PRE_SERVICO] },
  { grupo: 'Tomador', grupoSlug: 'tomador', campos: [TOMA_CNPJ] },
  { grupo: 'Prestador', grupoSlug: 'prestador', campos: [CNPJ_PRESTADOR] },
]

const SLUG_DA_DISCRIMINACAO = 'servico-discriminacao'

const USOS_DA_DISCRIMINACAO = [
  {
    provedorSlug: 'elotech',
    provedorNome: 'Elotech',
    versaoSlug: '2-03',
    versaoRotulo: '2.03',
    destinoXml: 'InfDeclaracaoPrestacaoServico/Servico/Discriminacao',
    estadoPreenchimento: 'Obrigatorio',
  },
  {
    provedorSlug: 'iss-net',
    provedorNome: 'ISS.NET',
    versaoSlug: '1-01',
    versaoRotulo: '1.01',
    destinoXml: 'DPS/infDPS/serv/cServ/xDescServ',
    estadoPreenchimento: 'Obrigatorio',
  },
]

const VERSAO_8 = { slug: '8', rotulo: '8', estado: 'Vigente', ordem: 3, totalCampos: 547 }

const CAMPOS_PUBLICADOS = [DISCRIMINACAO, PAI_PRE_SERVICO, TOMA_CNPJ, CNPJ_PRESTADOR]

/** Slugs consultados em P12, na ordem em que as requisições chegam ao servidor. */
let slugsConsultados: string[] = []

function responderCampoLayout() {
  return http.get(`${API_URL}/layout/campos/:slug`, ({ params }) => {
    const slug = String(params.slug)
    slugsConsultados.push(slug)

    const campo = CAMPOS_PUBLICADOS.find((candidato) => candidato.slug === slug)
    if (!campo) return HttpResponse.json({ error: { code: 'NAO_ENCONTRADO' } }, { status: 404 })

    return HttpResponse.json({
      data: {
        slug: campo.slug,
        nome: campo.nome,
        caminhoXml: campo.caminhoXml,
        significado: campo.significado,
        estado: 'Ativo',
        versaoExibicao: VERSAO_8,
        versaoOrigem: VERSAO_8,
        versaoDescontinuado: null,
        ondeEUsado: slug === SLUG_DA_DISCRIMINACAO ? USOS_DA_DISCRIMINACAO : [],
      },
      message: null,
    })
  })
}

function Hospedeiro() {
  const campoDestacado = useCampoDestacadoPorAncora()

  return (
    <DicionarioDaVersao
      versaoRotulo="8"
      totalCampos={4}
      camposPorGrupo={CAMPOS_POR_GRUPO}
      origemUrl={ORIGEM}
      campoDestacado={campoDestacado}
    />
  )
}

/** Destino de "Ver no provedor": tem uma linha com o mesmo `id` que a do dicionário. */
function PaginaDoProvedorFalsa() {
  return (
    <main>
      <h1>Página do provedor</h1>
      <table>
        <tbody>
          <tr id="campo-servico-discriminacao">
            <td>
              <button type="button" data-botao-do-campo="">
                Discriminacao no provedor
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  )
}

async function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute({ component: Outlet })
  const rotaDoDicionario = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: Hospedeiro,
  })
  const rotaDoProvedor = createRoute({
    getParentRoute: () => rootRoute,
    path: '/provedores/$provedorSlug',
    component: PaginaDoProvedorFalsa,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rotaDoDicionario, rotaDoProvedor]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  // Âncora de montagem: o roteador monta de forma assíncrona.
  await screen.findByRole('heading', { level: 2, name: 'Dicionário de campos' })

  return router
}

function botaoDoCampo(nome: string) {
  return screen.getByRole('button', { name: nome })
}

function blocoDe(raiz: string) {
  return document.getElementById(`bloco-${raiz}`)
}

function irParaAncora(slug: string) {
  window.location.hash = `#campo-${slug}`
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  slugsConsultados = []
  server.use(responderCampoLayout())
})

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState(null, '', window.location.pathname)
})

describe('DicionarioDaVersao com o modal real: foco ao fechar', () => {
  it('abrir o campo 1, avançar 2 vezes para outro bloco e fechar com Esc leva o foco à linha do campo 3, com o bloco dele na tela', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    expect(blocoDe('Tomador')).toBeNull()

    await usuario.click(botaoDoCampo('Discriminacao'))
    const dialogo = await screen.findByRole('dialog', { name: 'Discriminacao' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Próximo campo' }))
    await usuario.click(
      within(await screen.findByRole('dialog', { name: 'PaiPreServico' })).getByRole('button', {
        name: 'Próximo campo',
      }),
    )
    await screen.findByRole('dialog', { name: 'TomaCNPJ' })

    await usuario.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(botaoDoCampo('TomaCNPJ')))
    expect(blocoDe('Tomador')).not.toBeNull()
  })
})

describe('DicionarioDaVersao com o modal real: âncora', () => {
  it('o hash abre o modal com uma só linha atual; Esc limpa o hash e o mesmo link reabre', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    irParaAncora('tomador-tomacnpj')

    await screen.findByRole('dialog', { name: 'TomaCNPJ' })
    expect(blocoDe('Tomador')).not.toBeNull()
    expect(document.querySelectorAll('[aria-current="true"]')).toHaveLength(1)
    expect(botaoDoCampo('TomaCNPJ')).toHaveAttribute('aria-current', 'true')

    await usuario.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(window.location.hash).toBe('')

    irParaAncora('tomador-tomacnpj')

    expect(await screen.findByRole('dialog', { name: 'TomaCNPJ' })).toBeInTheDocument()
  })
})

describe('DicionarioDaVersao com o modal real: copiar o link do campo', () => {
  it('copia a origem da aplicação mais a `urlCanonica` do campo, nunca um caminho montado à mão', async () => {
    const usuario = userEvent.setup()
    const escrever = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    await renderizar()

    await usuario.click(botaoDoCampo('Discriminacao'))
    await usuario.click(
      await screen.findByRole('button', { name: 'Copiar link do campo Discriminacao' }),
    )

    expect(escrever).toHaveBeenLastCalledWith(
      'https://codex.migrate.info/layout/campos/servico-discriminacao-canonico',
    )
  })
})

describe('DicionarioDaVersao com o modal real: "Ver no provedor"', () => {
  it('o link leva à linha do campo na página do provedor, com o hash da âncora', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(botaoDoCampo('Discriminacao'))
    const link = await screen.findByRole('link', {
      name: 'Ver no provedor: Discriminacao em ISS.NET',
    })

    expect(link).toHaveAttribute('href', '/provedores/iss-net#campo-servico-discriminacao')
  })

  it('seguir o link fecha o modal e o foco NÃO vai para a linha de mesmo id da página do provedor', async () => {
    const usuario = userEvent.setup()
    const router = await renderizar()

    await usuario.click(botaoDoCampo('Discriminacao'))
    await usuario.click(
      await screen.findByRole('link', { name: 'Ver no provedor: Discriminacao em ISS.NET' }),
    )

    await screen.findByRole('heading', { level: 1, name: 'Página do provedor' })
    expect(router.state.location.pathname).toBe('/provedores/iss-net')
    expect(router.state.location.hash).toBe('campo-servico-discriminacao')
    expect(screen.queryByRole('dialog')).toBeNull()

    const botaoDoProvedor = screen.getByRole('button', { name: 'Discriminacao no provedor' })
    expect(botaoDoProvedor).not.toHaveFocus()
  })
})

describe('DicionarioDaVersao com o modal real: atraso da consulta ao navegar', () => {
  it('atravessar campos em sequência consulta só o de onde se parou, e a abertura não espera', async () => {
    await renderizar()

    fireEvent.click(botaoDoCampo('Discriminacao'))
    await waitFor(() => expect(slugsConsultados).toEqual(['servico-discriminacao']))
    await screen.findAllByRole('link', { name: /Ver no provedor: Discriminacao/ })

    // Três avanços no mesmo instante: Discriminacao → PaiPreServico → TomaCNPJ → CNPJ_prest.
    for (let avanco = 0; avanco < 3; avanco += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Próximo campo' }))
    }

    expect(screen.getByRole('dialog', { name: 'CNPJ_prest' })).toBeInTheDocument()
    // Durante o atraso o título já é o do campo novo; os usos do campo anterior não podem aparecer.
    expect(screen.getByText('Carregando os provedores que usam este campo…')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ver no provedor/ })).toBeNull()
    expect(slugsConsultados).toEqual(['servico-discriminacao'])

    await waitFor(() => expect(slugsConsultados).toContain('prestador-cnpj-prest'))
    expect(slugsConsultados).toEqual(['servico-discriminacao', 'prestador-cnpj-prest'])
  })
})
