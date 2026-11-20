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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCampoDestacadoPorAncora } from '../utils/destaqueAncora'
import { CamposDaVersao } from './CamposDaVersao'
import { ID_SECAO_REJEICOES } from './RejeicoesDoCampo'

/**
 * Componente real, modal real, sob roteador - o que os testes de `CamposDaVersao` (modal falso) não
 * enxergam: a devolução do foco depois do fechamento, a âncora na URL e a rolagem para a seção de
 * rejeições. Registros copiados da resposta da API (Emissor Nacional 0.20), sem anotação com o tipo
 * do cliente; o caminho no XML nunca é igual ao destino.
 */
const BASE_DO_CAMPO = {
  mascara: null,
  dominio: null,
  condicao: null,
  exemplo: null,
  notaPreenchimento: null,
  notaTransformacao: null,
  errosConhecidos: [],
}

const DISCRIMINACAO = {
  ...BASE_DO_CAMPO,
  campoLayoutSlug: 'servico-discriminacao',
  reformaTributaria: false,
  nome: 'Discriminacao',
  caminhoXml: '//Servico/Discriminacao',
  significado: 'Descrição do serviço prestado.',
  tipo: 'Texto',
  tamanho: '1000',
  estadoPreenchimento: 'Obrigatorio' as const,
  destinoXml: null,
  ordem: 148,
}

const PAI_PRE_SERVICO = {
  ...BASE_DO_CAMPO,
  campoLayoutSlug: 'servico-paipreservico',
  reformaTributaria: false,
  nome: 'PaiPreServico',
  caminhoXml: '//Servico/PaiPreServico',
  significado: 'País de prestação do serviço.',
  tipo: 'Texto',
  tamanho: '2',
  estadoPreenchimento: 'Condicional' as const,
  destinoXml:
    'DPS/infDPS/serv/locPrest/cPaisPrestacao | DPS/infDPS/valores/trib/tribMun/cPaisResult',
  ordem: 150,
  errosConhecidos: [
    { slug: 'e0304-informe-um-codigo-de-pais-existente', codigo: 'E0304' },
    { slug: 'e0590-e-obrigatorio-informar-o-codigo-do-pais', codigo: 'E0590' },
  ],
}

const TOMA_CNPJ = {
  ...BASE_DO_CAMPO,
  campoLayoutSlug: 'tomador-tomacnpj',
  reformaTributaria: false,
  nome: 'TomaCNPJ',
  caminhoXml: '//Tomador/TomaCNPJ',
  significado: 'CNPJ do tomador.',
  tipo: 'Texto',
  tamanho: '14',
  estadoPreenchimento: 'Opcional' as const,
  destinoXml: 'DPS/infDPS/toma/CNPJ',
  ordem: 330,
}

const CAMPOS_POR_GRUPO = [
  { grupo: 'Servico', grupoSlug: 'servico', campos: [DISCRIMINACAO, PAI_PRE_SERVICO] },
  { grupo: 'Tomador', grupoSlug: 'tomador', campos: [TOMA_CNPJ] },
]

const ERROS_RESUMO = [
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
]

function Hospedeiro() {
  const campoDestacado = useCampoDestacadoPorAncora()

  return (
    <CamposDaVersao
      provedorNome="Emissor Nacional"
      versaoRotulo="0.20"
      totalCampos={3}
      camposPorGrupo={CAMPOS_POR_GRUPO}
      errosResumo={ERROS_RESUMO}
      urlProvedorAbsoluta="https://codex.migrate.info/provedores/emissor-nacional/0-20"
      campoDestacado={campoDestacado}
    />
  )
}

async function renderizar() {
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: Hospedeiro,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  render(<RouterProvider router={router} />)

  // Âncora de montagem: o roteador monta de forma assíncrona.
  await screen.findByRole('heading', { level: 2, name: 'Campos e mapeamento' })
}

function botaoDoCampo(nome: string) {
  return screen.getByRole('button', { name: nome })
}

function blocoDe(raiz: string) {
  return document.getElementById(`bloco-${raiz}`) as HTMLDetailsElement
}

function linhasMarcadasComoAtuais() {
  const secao = screen.getByRole('region', { name: 'Campos e mapeamento' })
  return secao.querySelectorAll('[data-botao-do-campo][aria-current]')
}

function buscar() {
  return screen.getByLabelText('Buscar campo do InvoiCy, tag do provedor ou caminho no XML')
}

const rolarParaOElemento = vi.fn()

beforeEach(() => {
  Element.prototype.scrollIntoView = rolarParaOElemento
  rolarParaOElemento.mockClear()
})

afterEach(() => {
  window.history.replaceState(null, '', window.location.pathname)
})

describe('CamposDaVersao com o modal real: foco ao fechar', () => {
  it('abrir o campo 1, avançar 2 vezes para um bloco fechado e fechar com Esc leva o foco à linha do campo 3, com o bloco aberto', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    expect(blocoDe('Tomador').open).toBe(false)

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
    expect(blocoDe('Tomador').open).toBe(true)
  })
})

describe('CamposDaVersao com o modal real: âncora de aviso', () => {
  function irParaAncora(slug: string) {
    window.location.hash = `#campo-${slug}`
  }

  it('o hash abre o modal com uma só linha atual; Esc limpa o hash e o mesmo link reabre', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    irParaAncora('tomador-tomacnpj')

    await screen.findByRole('dialog', { name: 'TomaCNPJ' })
    expect(linhasMarcadasComoAtuais()).toHaveLength(1)
    expect(botaoDoCampo('TomaCNPJ')).toHaveAttribute('aria-current', 'true')

    await usuario.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(window.location.hash).toBe('')

    irParaAncora('tomador-tomacnpj')

    expect(await screen.findByRole('dialog', { name: 'TomaCNPJ' })).toBeInTheDocument()
  })
})

describe('CamposDaVersao com o modal real: contador de rejeições', () => {
  it('o contador abre o modal rolando até a seção de rejeições; o botão de uma linha sem rejeição, não', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(
      screen.getByRole('button', { name: 'Ver as 2 rejeições registradas no campo PaiPreServico' }),
    )

    await screen.findByRole('dialog', { name: 'PaiPreServico' })
    const secaoDeRejeicoes = document.getElementById(ID_SECAO_REJEICOES)
    expect(secaoDeRejeicoes).not.toBeNull()
    expect(rolarParaOElemento.mock.contexts).toContain(secaoDeRejeicoes)

    await usuario.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    rolarParaOElemento.mockClear()

    await usuario.click(botaoDoCampo('Discriminacao'))

    await screen.findByRole('dialog', { name: 'Discriminacao' })
    expect(document.getElementById(ID_SECAO_REJEICOES)).toBeNull()
    const rolouParaRejeicoes = rolarParaOElemento.mock.contexts.some(
      (elemento) => elemento instanceof Element && elemento.id === ID_SECAO_REJEICOES,
    )
    expect(rolouParaRejeicoes).toBe(false)
  })
})

describe('CamposDaVersao com o modal real: busca, blocos e setas', () => {
  it('a busca com resultado só num bloco fechado o abre, e "Recolher todos" fecha', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    expect(blocoDe('Tomador').open).toBe(false)

    await usuario.type(buscar(), 'TomaCNPJ')

    await waitFor(() => expect(blocoDe('Tomador').open).toBe(true))

    await usuario.click(screen.getByRole('button', { name: 'Recolher todos' }))

    await waitFor(() => expect(blocoDe('Tomador').open).toBe(false))
  })

  it('as setas percorrem a sequência filtrada e o rodapé diz "no filtro atual"', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.type(buscar(), 'Servico')

    await usuario.click(botaoDoCampo('Discriminacao'))
    await screen.findByRole('dialog', { name: 'Discriminacao' })
    expect(screen.getByRole('dialog')).toHaveTextContent('Campo 1 de 2 no filtro atual')

    await usuario.keyboard('{ArrowRight}')

    await screen.findByRole('dialog', { name: 'PaiPreServico' })
    expect(screen.getByRole('dialog')).toHaveTextContent('Campo 2 de 2 no filtro atual')

    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('dialog', { name: 'PaiPreServico' })).toBeInTheDocument()

    await usuario.keyboard('{ArrowLeft}')
    expect(await screen.findByRole('dialog', { name: 'Discriminacao' })).toBeInTheDocument()
  })
})

/**
 * O botão de copiar entrega exatamente o que está à vista: o caminho no Layout InvoiCy, nunca o
 * destino no XML do provedor - que é nulo na maioria dos campos e copiava string vazia.
 */
describe('CamposDaVersao com o modal real: copiar o caminho à vista', () => {
  it('campo sem destino no provedor copia o caminho do InvoiCy, nunca vazio', async () => {
    const usuario = userEvent.setup()
    const escrever = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    await renderizar()

    await usuario.click(botaoDoCampo('Discriminacao'))
    await usuario.click(
      await screen.findByRole('button', {
        name: 'Copiar caminho do campo Discriminacao no InvoiCy',
      }),
    )

    expect(escrever).toHaveBeenLastCalledWith('//Servico/Discriminacao')
  })

  it('campo com dois destinos copia o caminho do InvoiCy pelo botão do InvoiCy, não o destino', async () => {
    const usuario = userEvent.setup()
    const escrever = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    await renderizar()

    await usuario.click(botaoDoCampo('PaiPreServico'))
    await usuario.click(
      await screen.findByRole('button', {
        name: 'Copiar caminho do campo PaiPreServico no InvoiCy',
      }),
    )

    expect(escrever).toHaveBeenLastCalledWith('//Servico/PaiPreServico')
  })
})
