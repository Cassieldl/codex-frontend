import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { agruparEmBlocos, filtrarBlocos } from '../utils/blocosDoLayout'
import type { GrupoDeCampos } from '../utils/blocosDoLayout'
import { useBlocosNavegaveis } from './useBlocosNavegaveis'
import type { OpcoesBlocosNavegaveis } from './useBlocosNavegaveis'

interface CampoDeTeste {
  slug: string
  nome: string
}

// Três raízes que não estão em ordem alfabética nem na inversa dela.
const GRUPOS: GrupoDeCampos<CampoDeTeste>[] = [
  {
    grupo: 'Servico',
    grupoSlug: 'servico',
    campos: [
      { slug: 'servico-discriminacao', nome: 'Discriminacao' },
      { slug: 'servico-codigo', nome: 'Codigo' },
    ],
  },
  {
    grupo: 'Tomador',
    grupoSlug: 'tomador',
    campos: [{ slug: 'tomador-cnpj', nome: 'TomaCNPJ' }],
  },
  {
    grupo: 'Prestador',
    grupoSlug: 'prestador',
    campos: [{ slug: 'prestador-cnpj', nome: 'PrestCNPJ' }],
  },
]

const BLOCOS_COMPLETOS = agruparEmBlocos(GRUPOS)

function slugDoCampo(campo: CampoDeTeste): string {
  return campo.slug
}

function nomeDoCampo(campo: CampoDeTeste): string {
  return campo.nome
}

function ancoraNoHash(slug: string | null) {
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${slug ? `#campo-${slug}` : ''}`,
  )
}

/** Linha como a das tabelas: `id="campo-{slug}"` com o botão que recebe o foco. */
function criarLinha(slug: string): HTMLElement {
  const linha = document.createElement('div')
  linha.id = `campo-${slug}`

  const botao = document.createElement('button')
  botao.setAttribute('data-botao-do-campo', '')
  botao.textContent = slug
  linha.append(botao)

  return linha
}

function botaoDaLinha(linha: HTMLElement): HTMLElement {
  return linha.querySelector('[data-botao-do-campo]') as HTMLElement
}

function criarBusca(): HTMLInputElement {
  const busca = document.createElement('input')
  document.body.append(busca)
  return busca
}

function opcoes(
  sobrescritas: Partial<OpcoesBlocosNavegaveis<CampoDeTeste>> = {},
): OpcoesBlocosNavegaveis<CampoDeTeste> {
  return {
    blocosCompletos: BLOCOS_COMPLETOS,
    blocosFiltrados: BLOCOS_COMPLETOS,
    slugDoCampo,
    nomeDoCampo,
    campoDestacado: null,
    passaNoFiltroAtual: () => true,
    limparFiltros: vi.fn(),
    contenedorRef: { current: null },
    focoDeReservaRef: { current: null },
    ...sobrescritas,
  }
}

function renderizarHook(iniciais: OpcoesBlocosNavegaveis<CampoDeTeste>) {
  return renderHook(
    (props: OpcoesBlocosNavegaveis<CampoDeTeste>) =>
      useBlocosNavegaveis<CampoDeTeste, 'rejeicoes'>(props),
    { initialProps: iniciais },
  )
}

function raizesAbertas(blocosAbertos: ReadonlySet<string>): string[] {
  return [...blocosAbertos].sort()
}

let rolagem: Mock<(opcoes?: ScrollIntoViewOptions) => void>

beforeEach(() => {
  rolagem = vi.fn<(opcoes?: ScrollIntoViewOptions) => void>()
  Element.prototype.scrollIntoView = rolagem
})

afterEach(() => {
  document.body.innerHTML = ''
  ancoraNoHash(null)
})

describe('useBlocosNavegaveis — estado inicial', () => {
  it('abre só o primeiro bloco e não abre nenhum campo', () => {
    const { result } = renderizarHook(opcoes())

    expect(raizesAbertas(result.current.blocosAbertos)).toEqual(['Servico'])
    expect(result.current.campoAberto).toBeNull()
    expect(result.current.slugAtivo).toBeNull()
    expect(result.current.posicao).toBe(0)
    expect(result.current.total).toBe(4)
    expect(result.current.anterior).toBeNull()
    expect(result.current.proximo).toBeNull()
  })
})

describe('useBlocosNavegaveis — devolver o foco (R1)', () => {
  it('não toca na linha de mesmo id que está fora da lista quando a lista saiu da página', () => {
    const isca = criarLinha('servico-codigo')
    document.body.append(isca)
    const reserva = criarBusca()
    const { result } = renderizarHook(
      opcoes({ contenedorRef: { current: null }, focoDeReservaRef: { current: reserva } }),
    )

    act(() => result.current.abrirCampo('servico-codigo'))
    act(() => result.current.devolverFoco())

    expect(document.activeElement).toBe(document.body)
    expect(rolagem).not.toHaveBeenCalled()
  })

  it('não age quando o contêiner existe mas está desconectado, mesmo com isca de mesmo id fora', () => {
    const isca = criarLinha('servico-codigo')
    document.body.append(isca)
    const reserva = criarBusca()
    const contenedorSolto = document.createElement('div')
    const { result } = renderizarHook(
      opcoes({
        contenedorRef: { current: contenedorSolto },
        focoDeReservaRef: { current: reserva },
      }),
    )

    act(() => result.current.abrirCampo('servico-codigo'))
    act(() => result.current.devolverFoco())

    expect(document.activeElement).toBe(document.body)
    expect(rolagem).not.toHaveBeenCalled()
  })

  it('não rola nem foca a linha que está dentro de um contêiner desconectado', () => {
    const contenedorSolto = document.createElement('div')
    const linhaSolta = criarLinha('servico-codigo')
    contenedorSolto.append(linhaSolta)
    const reserva = criarBusca()
    const { result } = renderizarHook(
      opcoes({
        contenedorRef: { current: contenedorSolto },
        focoDeReservaRef: { current: reserva },
      }),
    )

    act(() => result.current.abrirCampo('servico-codigo'))
    act(() => result.current.devolverFoco())

    expect(rolagem).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(document.body)
  })

  it('rola até a linha do campo atual dentro do contêiner e foca o botão dela, não o da isca', () => {
    const isca = criarLinha('servico-codigo')
    document.body.append(isca)
    const contenedor = document.createElement('div')
    const linha = criarLinha('servico-codigo')
    contenedor.append(linha)
    document.body.append(contenedor)
    const { result } = renderizarHook(opcoes({ contenedorRef: { current: contenedor } }))

    act(() => result.current.abrirCampo('servico-codigo'))
    act(() => result.current.devolverFoco())

    expect(rolagem).toHaveBeenCalledTimes(1)
    expect(rolagem).toHaveBeenCalledWith({ block: 'nearest' })
    expect(rolagem.mock.contexts[0]).toBe(linha)
    expect(document.activeElement).toBe(botaoDaLinha(linha))
  })

  it('volta ao foco do campo atual, não ao do campo que abriu o modal', () => {
    const contenedor = document.createElement('div')
    const linhaDoPrimeiro = criarLinha('servico-discriminacao')
    const linhaDoSegundo = criarLinha('servico-codigo')
    contenedor.append(linhaDoPrimeiro, linhaDoSegundo)
    document.body.append(contenedor)
    const { result } = renderizarHook(opcoes({ contenedorRef: { current: contenedor } }))

    act(() => result.current.abrirCampo('servico-discriminacao'))
    act(() => result.current.navegarParaCampo('servico-codigo'))
    act(() => result.current.devolverFoco())

    expect(document.activeElement).toBe(botaoDaLinha(linhaDoSegundo))
  })

  it('foca a reserva (a busca) quando a linha do campo atual não está na lista', () => {
    const contenedor = document.createElement('div')
    document.body.append(contenedor)
    const reserva = criarBusca()
    const { result } = renderizarHook(
      opcoes({ contenedorRef: { current: contenedor }, focoDeReservaRef: { current: reserva } }),
    )

    act(() => result.current.abrirCampo('servico-codigo'))
    act(() => result.current.devolverFoco())

    expect(document.activeElement).toBe(reserva)
    expect(rolagem).not.toHaveBeenCalled()
  })

  it('foca a reserva quando nenhum campo foi aberto', () => {
    const contenedor = document.createElement('div')
    document.body.append(contenedor)
    const reserva = criarBusca()
    const { result } = renderizarHook(
      opcoes({ contenedorRef: { current: contenedor }, focoDeReservaRef: { current: reserva } }),
    )

    act(() => result.current.devolverFoco())

    expect(document.activeElement).toBe(reserva)
  })
})

describe('useBlocosNavegaveis — navegação entre campos', () => {
  it('navegar para um campo de bloco fechado abre o bloco e o campo', () => {
    const { result } = renderizarHook(opcoes())
    expect(raizesAbertas(result.current.blocosAbertos)).toEqual(['Servico'])

    act(() => result.current.navegarParaCampo('tomador-cnpj'))

    expect(raizesAbertas(result.current.blocosAbertos)).toEqual(['Servico', 'Tomador'])
    expect(result.current.campoAberto).toEqual({ slug: 'tomador-cnpj', secao: undefined })
    expect(result.current.slugAtivo).toBe('tomador-cnpj')
  })

  it('abrir um campo guarda a seção pedida', () => {
    const { result } = renderizarHook(opcoes())

    act(() => result.current.abrirCampo('servico-codigo', 'rejeicoes'))

    expect(result.current.campoAberto).toEqual({ slug: 'servico-codigo', secao: 'rejeicoes' })
  })

  it('posição, total, anterior e próximo seguem a ordem do DOM', () => {
    const { result } = renderizarHook(opcoes())

    act(() => result.current.abrirCampo('servico-codigo'))

    expect(result.current.posicao).toBe(2)
    expect(result.current.total).toBe(4)
    expect(result.current.itemAberto?.campo.slug).toBe('servico-codigo')
    expect(result.current.itemAberto?.raiz).toBe('Servico')
    expect(result.current.anterior).toEqual({
      slug: 'servico-discriminacao',
      nome: 'Discriminacao',
    })
    expect(result.current.proximo).toEqual({ slug: 'tomador-cnpj', nome: 'TomaCNPJ' })
  })

  it('nas pontas da sequência não há vizinho do lado de fora', () => {
    const { result } = renderizarHook(opcoes())

    act(() => result.current.abrirCampo('servico-discriminacao'))
    expect(result.current.anterior).toBeNull()
    expect(result.current.proximo?.slug).toBe('servico-codigo')

    act(() => result.current.abrirCampo('prestador-cnpj'))
    expect(result.current.proximo).toBeNull()
    expect(result.current.anterior?.slug).toBe('tomador-cnpj')
  })

  it('a sequência respeita o filtro, e campo aberto que o filtro escondeu não tem item', () => {
    const blocosFiltrados = filtrarBlocos(
      BLOCOS_COMPLETOS,
      (campo) => campo.slug !== 'servico-codigo',
    )
    const { result } = renderizarHook(opcoes({ blocosFiltrados }))

    expect(result.current.total).toBe(3)

    act(() => result.current.abrirCampo('servico-codigo'))

    expect(result.current.campoAberto?.slug).toBe('servico-codigo')
    expect(result.current.itemAberto).toBeUndefined()
    expect(result.current.posicao).toBe(0)
    expect(result.current.anterior).toBeNull()
    expect(result.current.proximo).toBeNull()
  })
})

describe('useBlocosNavegaveis — blocos abertos', () => {
  it('alterna um bloco para aberto e para fechado', () => {
    const { result } = renderizarHook(opcoes())

    act(() => result.current.alternarBloco('Tomador', true))
    expect(raizesAbertas(result.current.blocosAbertos)).toEqual(['Servico', 'Tomador'])

    act(() => result.current.alternarBloco('Servico', false))
    expect(raizesAbertas(result.current.blocosAbertos)).toEqual(['Tomador'])
  })

  it('abrirBlocos faz a união com o que já estava aberto', () => {
    const { result } = renderizarHook(opcoes())

    act(() => result.current.abrirBlocos(['Prestador']))

    expect(raizesAbertas(result.current.blocosAbertos)).toEqual(['Prestador', 'Servico'])
  })

  it('expandirTodos abre só os blocos com campo visível', () => {
    const blocosFiltrados = filtrarBlocos(
      BLOCOS_COMPLETOS,
      (campo) => campo.slug === 'tomador-cnpj',
    )
    const { result } = renderizarHook(opcoes({ blocosFiltrados }))

    act(() => result.current.expandirTodos())

    expect(raizesAbertas(result.current.blocosAbertos)).toEqual(['Tomador'])
  })

  it('recolherTodos fecha todos', () => {
    const { result } = renderizarHook(opcoes())

    act(() => result.current.recolherTodos())

    expect(raizesAbertas(result.current.blocosAbertos)).toEqual([])
  })

  it('irParaBloco abre o bloco, rola até ele e foca o resumo', () => {
    const bloco = document.createElement('details')
    bloco.id = 'bloco-Tomador'
    const resumo = document.createElement('summary')
    bloco.append(resumo)
    document.body.append(bloco)
    const { result } = renderizarHook(opcoes())

    act(() => result.current.irParaBloco('Tomador'))

    expect(raizesAbertas(result.current.blocosAbertos)).toEqual(['Servico', 'Tomador'])
    expect(rolagem).toHaveBeenCalledWith({ block: 'start' })
    expect(rolagem.mock.contexts[0]).toBe(bloco)
    expect(document.activeElement).toBe(resumo)
  })
})

describe('useBlocosNavegaveis — chegada por âncora', () => {
  it('abre o bloco, abre o campo e rola até a linha, sem limpar filtro que não esconde o campo', () => {
    const linha = criarLinha('prestador-cnpj')
    document.body.append(linha)
    const limparFiltros = vi.fn()

    const { result } = renderizarHook(
      opcoes({ campoDestacado: 'prestador-cnpj', passaNoFiltroAtual: () => true, limparFiltros }),
    )

    expect(raizesAbertas(result.current.blocosAbertos)).toEqual(['Prestador', 'Servico'])
    expect(result.current.campoAberto).toEqual({ slug: 'prestador-cnpj', secao: undefined })
    expect(rolagem).toHaveBeenCalledWith({ block: 'center' })
    expect(rolagem.mock.contexts).toContain(linha)
    expect(limparFiltros).not.toHaveBeenCalled()
  })

  it('limpa o filtro quando ele esconde o campo apontado', () => {
    const limparFiltros = vi.fn()

    const { result } = renderizarHook(
      opcoes({ campoDestacado: 'tomador-cnpj', passaNoFiltroAtual: () => false, limparFiltros }),
    )

    expect(limparFiltros).toHaveBeenCalledTimes(1)
    expect(result.current.campoAberto?.slug).toBe('tomador-cnpj')
    expect(raizesAbertas(result.current.blocosAbertos)).toEqual(['Servico', 'Tomador'])
  })

  it('a chegada acontece uma vez por slug, inclusive com os efeitos rodando duas vezes', () => {
    const limparFiltros = vi.fn()

    renderHook(
      () =>
        useBlocosNavegaveis<CampoDeTeste, 'rejeicoes'>(
          opcoes({
            campoDestacado: 'tomador-cnpj',
            passaNoFiltroAtual: () => false,
            limparFiltros,
          }),
        ),
      { reactStrictMode: true },
    )

    expect(limparFiltros).toHaveBeenCalledTimes(1)
  })

  it('slug nulo rearma: o mesmo slug volta a abrir o campo depois de passar por nulo', () => {
    const { result, rerender } = renderizarHook(opcoes({ campoDestacado: 'tomador-cnpj' }))
    expect(result.current.campoAberto?.slug).toBe('tomador-cnpj')

    act(() => result.current.fecharCampo())
    expect(result.current.campoAberto).toBeNull()

    rerender(opcoes({ campoDestacado: null }))
    rerender(opcoes({ campoDestacado: 'tomador-cnpj' }))

    expect(result.current.campoAberto?.slug).toBe('tomador-cnpj')
  })

  it('slug que não existe na versão não faz nada', () => {
    const limparFiltros = vi.fn()

    const { result } = renderizarHook(
      opcoes({
        campoDestacado: 'campo-que-nao-existe',
        passaNoFiltroAtual: () => false,
        limparFiltros,
      }),
    )

    expect(result.current.campoAberto).toBeNull()
    expect(raizesAbertas(result.current.blocosAbertos)).toEqual(['Servico'])
    expect(limparFiltros).not.toHaveBeenCalled()
    expect(rolagem).not.toHaveBeenCalled()
  })
})

describe('useBlocosNavegaveis — fechar o campo', () => {
  it('com âncora ativa tira o hash da URL sem disparar hashchange para a página', () => {
    ancoraNoHash('tomador-cnpj')
    const aoMudarHash = vi.fn()
    window.addEventListener('hashchange', aoMudarHash)

    const { result } = renderizarHook(opcoes({ campoDestacado: 'tomador-cnpj' }))
    act(() => result.current.fecharCampo())
    window.removeEventListener('hashchange', aoMudarHash)

    expect(result.current.campoAberto).toBeNull()
    expect(window.location.hash).toBe('')
    expect(aoMudarHash).not.toHaveBeenCalled()
  })

  it('sem âncora ativa só fecha: o hash da URL não é tocado', () => {
    ancoraNoHash('tomador-cnpj')

    const { result } = renderizarHook(opcoes({ campoDestacado: null }))
    act(() => result.current.abrirCampo('servico-codigo'))
    act(() => result.current.fecharCampo())

    expect(result.current.campoAberto).toBeNull()
    expect(window.location.hash).toBe('#campo-tomador-cnpj')
  })

  it('o campo destacado na lista persiste depois de fechar o modal', () => {
    const { result } = renderizarHook(opcoes())

    act(() => result.current.abrirCampo('servico-codigo'))
    act(() => result.current.fecharCampo())

    expect(result.current.slugAtivo).toBe('servico-codigo')
  })
})
