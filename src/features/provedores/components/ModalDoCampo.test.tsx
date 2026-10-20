import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSyncExternalStore } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import type { ModalDoCampoProps } from '../types/modalDoCampo'
import { ModalDoCampo } from './ModalDoCampo'

/**
 * Campos transcritos da resposta real de `GET /provedores/emissor-nacional/versoes/0-20`, **sem
 * anotação do tipo do cliente**.
 */
const CAMPO_COM_REJEICOES = {
  campoLayoutSlug: 'servico-paipreservico',
  nome: 'PaiPreServico',
  caminhoXml: '//Servico/PaiPreServico',
  significado:
    'País de prestação do serviço. Sigla do país onde o serviço foi prestado. Lista de siglas https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2',
  tipo: 'Texto',
  tamanho: '2',
  mascara: null,
  dominio: null,
  estadoPreenchimento: 'Condicional' as const,
  condicao: 'Informar apenas um entre: cLocPrestacao, cPaisPrestacao.',
  exemplo: null,
  notaPreenchimento:
    'Na DPS: Código do país onde ocorreu a prestação do serviço. (Tabela de Países ISO)\n\nFormato aceito pelo XSD: [A-Z]{2}',
  destinoXml:
    'DPS/infDPS/serv/locPrest/cPaisPrestacao | DPS/infDPS/valores/trib/tribMun/cPaisResult',
  notaTransformacao:
    'O InvoiCy grava este campo em 2 tags da DPS: DPS/infDPS/serv/locPrest/cPaisPrestacao, DPS/infDPS/valores/trib/tribMun/cPaisResult.',
  ordem: 150,
  errosConhecidos: [
    {
      slug: 'e0304-informe-um-codigo-de-pais-existente-diferente-de-brasil-br-conforme-tabela-de-pais-iso2',
      codigo: 'E0304',
    },
  ],
}

const RESUMO_DA_REJEICAO = [
  {
    slug: 'e0304-informe-um-codigo-de-pais-existente-diferente-de-brasil-br-conforme-tabela-de-pais-iso2',
    codigo: 'E0304',
    titulo:
      'Informe um código de país existente diferente de Brasil (BR), conforme tabela de país ISO2.',
    variantes: [
      'Informe um código de país existente diferente de Brasil (BR), conforme tabela de país ISO2.',
    ],
  },
]

const CAMPO_SEGUINTE = {
  campoLayoutSlug: 'tpsusp',
  nome: 'tpSusp',
  caminhoXml: '//tpSusp',
  significado:
    'Opção para Exigibilidade suspensa. Valores aceitos: 1 - Exigibilidade Suspensa por Decisão Judicial; 2 - Exigibilidade Suspensa por Processo Administrativo',
  tipo: 'Numérico',
  tamanho: '1',
  mascara: null,
  dominio:
    '1 = Exigibilidade do ISSQN Suspensa por Decisão Judicial; 2 = Exigibilidade do ISSQN Suspensa por Processo Administrativo',
  estadoPreenchimento: 'Condicional' as const,
  condicao: 'Obrigatório quando o grupo exigSusp for informado.',
  exemplo: null,
  notaPreenchimento: 'Na DPS: Opção para Exigibilidade Suspensa.',
  destinoXml: 'DPS/infDPS/valores/trib/tribMun/exigSusp/tpSusp',
  notaTransformacao: null,
  ordem: 26,
  errosConhecidos: [],
}

/** O campo seguinte também tem rejeições: uma rolagem repetida na troca teria onde acontecer. */
const CAMPO_SEGUINTE_COM_REJEICOES = {
  ...CAMPO_SEGUINTE,
  errosConhecidos: CAMPO_COM_REJEICOES.errosConhecidos,
}

const VIZINHO_ANTERIOR = { campoLayoutSlug: 'servico-valores-valservicos', nome: 'ValServicos' }
const VIZINHO_SEGUINTE = { campoLayoutSlug: 'tpsusp', nome: 'tpSusp' }
const URL_DA_VERSAO = 'https://codex.migrate.info/provedores/emissor-nacional/0-20'

function propsBase(sobrescritas: Partial<ModalDoCampoProps> = {}): ModalDoCampoProps {
  return {
    campo: CAMPO_COM_REJEICOES,
    trilha: 'Serviço',
    posicao: 3,
    total: 7,
    filtroAtivo: false,
    anterior: VIZINHO_ANTERIOR,
    proximo: VIZINHO_SEGUINTE,
    onNavegar: vi.fn(),
    onFechar: vi.fn(),
    devolverFoco: vi.fn(),
    errosResumo: RESUMO_DA_REJEICAO,
    urlVersaoAbsoluta: URL_DA_VERSAO,
    ...sobrescritas,
  }
}

/**
 * Monta o modal real sob um router (a seção de rejeições usa `Link`). As props ficam num estado
 * externo para o teste poder "rerenderizar" com o campo novo, como a página faz ao navegar, e há
 * um botão gatilho fora do modal para provar quem devolve o foco.
 */
function renderizar(props: ModalDoCampoProps, { abertoNaMontagem = true } = {}) {
  let estado = { props, aberto: abertoNaMontagem }
  const ouvintes = new Set<() => void>()

  function assinar(ouvinte: () => void) {
    ouvintes.add(ouvinte)
    return () => ouvintes.delete(ouvinte)
  }

  function atualizar(parcial: Partial<typeof estado>) {
    estado = { ...estado, ...parcial }
    ouvintes.forEach((ouvinte) => ouvinte())
  }

  function Ponte() {
    const atual = useSyncExternalStore(assinar, () => estado)

    return (
      <>
        <button type="button" onClick={() => atualizar({ aberto: true })}>
          Abrir campo
        </button>
        {atual.aberto && <ModalDoCampo {...atual.props} />}
      </>
    )
  }

  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Ponte })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  render(<RouterProvider router={router} />)

  return {
    trocarProps: (novas: Partial<ModalDoCampoProps>) =>
      act(() => atualizar({ props: { ...estado.props, ...novas } })),
    fechar: () => act(() => atualizar({ aberto: false })),
  }
}

function regiaoDeAnuncio() {
  return screen
    .getAllByRole('status')
    .find((regiao) => regiao.hasAttribute('data-anuncio-de-navegacao'))!
}

let rolagem: Mock<Element['scrollIntoView']>

beforeEach(() => {
  rolagem = vi.fn<Element['scrollIntoView']>()
  Element.prototype.scrollIntoView = rolagem
})

describe('ModalDoCampo — identificação', () => {
  it('é um diálogo com o nome do campo, a trilha e a posição na sequência', async () => {
    renderizar(propsBase())

    const dialogo = await screen.findByRole('dialog', { name: 'PaiPreServico' })

    expect(dialogo).toHaveTextContent('Serviço')
    expect(screen.getByText('Campo 3 de 7')).toBeInTheDocument()
    expect(screen.getByText('Condicional')).toBeInTheDocument()
  })

  it('só diz "no filtro atual" quando há filtro ativo', async () => {
    const { trocarProps } = renderizar(propsBase())
    await screen.findByRole('dialog')

    expect(screen.queryByText('no filtro atual')).toBeNull()

    trocarProps({ filtroAtivo: true })

    expect(screen.getByText('no filtro atual')).toBeInTheDocument()
  })

  it('abre com o foco no próprio diálogo, não no primeiro botão', async () => {
    renderizar(propsBase())

    expect(await screen.findByRole('dialog')).toHaveFocus()
  })
})

describe('ModalDoCampo — navegação', () => {
  it('Próximo campo e Campo anterior chamam onNavegar com o slug do vizinho', async () => {
    const onNavegar = vi.fn()
    const usuario = userEvent.setup()
    renderizar(propsBase({ onNavegar }))
    await screen.findByRole('dialog')

    await usuario.click(screen.getByRole('button', { name: 'Próximo campo' }))
    expect(onNavegar).toHaveBeenLastCalledWith('tpsusp')

    await usuario.click(screen.getByRole('button', { name: 'Campo anterior' }))
    expect(onNavegar).toHaveBeenLastCalledWith('servico-valores-valservicos')
    expect(onNavegar).toHaveBeenCalledTimes(2)
  })

  it('as setas → e ← fazem o mesmo, e o navegador não rola nem anda por elas', async () => {
    const onNavegar = vi.fn()
    renderizar(propsBase({ onNavegar }))
    const dialogo = await screen.findByRole('dialog')

    const proximoNaoCancelado = fireEvent.keyDown(dialogo, { key: 'ArrowRight' })
    const anteriorNaoCancelado = fireEvent.keyDown(dialogo, { key: 'ArrowLeft' })

    expect(onNavegar.mock.calls).toEqual([['tpsusp'], ['servico-valores-valservicos']])
    expect(proximoNaoCancelado).toBe(false)
    expect(anteriorNaoCancelado).toBe(false)
  })

  it.each([
    ['Alt', { altKey: true }],
    ['Ctrl', { ctrlKey: true }],
    ['Meta', { metaKey: true }],
    ['Shift', { shiftKey: true }],
  ])('%s+← não navega e deixa o evento para o navegador', async (_modificador, modificador) => {
    const onNavegar = vi.fn()
    renderizar(propsBase({ onNavegar }))
    const dialogo = await screen.findByRole('dialog')

    const naoCancelado = fireEvent.keyDown(dialogo, { key: 'ArrowLeft', ...modificador })

    expect(onNavegar).not.toHaveBeenCalled()
    expect(naoCancelado).toBe(true)
  })

  it('na ponta, o botão fica aria-disabled, não disabled, e o foco continua nele', async () => {
    const onNavegar = vi.fn()
    const usuario = userEvent.setup()
    renderizar(propsBase({ anterior: null, onNavegar }))
    await screen.findByRole('dialog')

    const botao = screen.getByRole('button', { name: 'Campo anterior' })
    await usuario.click(botao)

    expect(botao).toHaveAttribute('aria-disabled', 'true')
    expect(botao).not.toBeDisabled()
    expect(botao).toHaveFocus()
    expect(onNavegar).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Próximo campo' })).not.toHaveAttribute(
      'aria-disabled',
    )
  })

  it('seta sem vizinho não navega e não cancela o evento', async () => {
    const onNavegar = vi.fn()
    renderizar(propsBase({ anterior: null, proximo: null, onNavegar }))
    const dialogo = await screen.findByRole('dialog')

    const esquerdaNaoCancelada = fireEvent.keyDown(dialogo, { key: 'ArrowLeft' })
    const direitaNaoCancelada = fireEvent.keyDown(dialogo, { key: 'ArrowRight' })

    expect(onNavegar).not.toHaveBeenCalled()
    expect(esquerdaNaoCancelada).toBe(true)
    expect(direitaNaoCancelada).toBe(true)
  })

  it('trocar de campo pelos botões deixa o foco no botão', async () => {
    const usuario = userEvent.setup()
    const { trocarProps } = renderizar(
      propsBase({ onNavegar: () => trocarProps({ campo: CAMPO_SEGUINTE, posicao: 4 }) }),
    )
    await screen.findByRole('dialog')

    const proximo = screen.getByRole('button', { name: 'Próximo campo' })
    await usuario.click(proximo)

    expect(await screen.findByRole('dialog', { name: 'tpSusp' })).toBeInTheDocument()
    expect(proximo).toHaveFocus()
  })

  it('trocar de campo pela seta, com o foco num botão do corpo que sumiu, devolve o foco ao diálogo', async () => {
    const usuario = userEvent.setup()
    const { trocarProps } = renderizar(
      propsBase({ onNavegar: () => trocarProps({ campo: CAMPO_SEGUINTE, posicao: 4 }) }),
    )
    await screen.findByRole('dialog')

    screen.getByRole('button', { name: 'Copiar caminho do campo PaiPreServico no InvoiCy' }).focus()
    await usuario.keyboard('{ArrowRight}')

    expect(await screen.findByRole('dialog', { name: 'tpSusp' })).toHaveFocus()
  })
})

describe('ModalDoCampo — anúncio da troca', () => {
  it('fica vazio na abertura e diz exatamente em que campo se está depois de trocar', async () => {
    const usuario = userEvent.setup()
    const { trocarProps } = renderizar(
      propsBase({ onNavegar: () => trocarProps({ campo: CAMPO_SEGUINTE, posicao: 4 }) }),
    )
    await screen.findByRole('dialog')

    expect(regiaoDeAnuncio().textContent).toBe('')

    await usuario.click(screen.getByRole('button', { name: 'Próximo campo' }))

    expect(regiaoDeAnuncio().textContent).toBe('Campo 4 de 7: tpSusp')
  })

  it('anuncia também a troca feita pelo teclado', async () => {
    const usuario = userEvent.setup()
    const { trocarProps } = renderizar(
      propsBase({ onNavegar: () => trocarProps({ campo: CAMPO_SEGUINTE, posicao: 4 }) }),
    )
    await screen.findByRole('dialog')

    await usuario.keyboard('{ArrowRight}')

    expect(regiaoDeAnuncio().textContent).toBe('Campo 4 de 7: tpSusp')
  })
})

describe('ModalDoCampo — copiar link do campo', () => {
  it('copia a URL da versão com a âncora do campo', async () => {
    const usuario = userEvent.setup()
    const escreverNaAreaDeTransferencia = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)
    renderizar(propsBase())
    await screen.findByRole('dialog')

    await usuario.click(screen.getByRole('button', { name: 'Copiar link do campo PaiPreServico' }))

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith(
      'https://codex.migrate.info/provedores/emissor-nacional/0-20#campo-servico-paipreservico',
    )
  })
})

describe('ModalDoCampo — seção inicial', () => {
  it('"rejeicoes" rola uma vez, até o topo da seção de rejeições', async () => {
    renderizar(propsBase({ secaoInicial: 'rejeicoes' }))
    await screen.findByRole('region', { name: 'Rejeições registradas (1)' })

    expect(rolagem).toHaveBeenCalledTimes(1)
    expect(rolagem).toHaveBeenCalledWith({ block: 'start' })
    expect((rolagem.mock.contexts[0] as HTMLElement).id).toBe('rejeicoes-do-campo')
  })

  it('sem a prop, não rola', async () => {
    renderizar(propsBase())
    await screen.findByRole('region', { name: 'Rejeições registradas (1)' })

    expect(rolagem).not.toHaveBeenCalled()
  })

  it('navegar para outro campo não repete a rolagem da abertura', async () => {
    const { trocarProps } = renderizar(propsBase({ secaoInicial: 'rejeicoes' }))
    await screen.findByRole('region', { name: 'Rejeições registradas (1)' })

    trocarProps({ campo: CAMPO_SEGUINTE_COM_REJEICOES, posicao: 4 })
    await screen.findByRole('dialog', { name: 'tpSusp' })
    expect(screen.getByRole('region', { name: 'Rejeições registradas (1)' })).toBeInTheDocument()

    expect(rolagem).toHaveBeenCalledTimes(1)
  })
})

describe('ModalDoCampo — fechar', () => {
  it('Esc chama onFechar', async () => {
    const onFechar = vi.fn()
    const usuario = userEvent.setup()
    renderizar(propsBase({ onFechar }))
    await screen.findByRole('dialog')

    await usuario.keyboard('{Escape}')

    expect(onFechar).toHaveBeenCalledTimes(1)
  })

  it('devolve o foco uma só vez, pelo devolverFoco, sem focar quem abriu o modal', async () => {
    const devolverFoco = vi.fn()
    const usuario = userEvent.setup()
    const { fechar } = renderizar(propsBase({ devolverFoco }), { abertoNaMontagem: false })

    const gatilho = await screen.findByRole('button', { name: 'Abrir campo' })
    await usuario.click(gatilho)
    await screen.findByRole('dialog')
    // Depois do clique: o user-event também chama `focus()` ao clicar.
    const focarGatilho = vi.spyOn(gatilho, 'focus')

    fechar()

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(devolverFoco).toHaveBeenCalledTimes(1)
    expect(focarGatilho).not.toHaveBeenCalled()
  })
})
