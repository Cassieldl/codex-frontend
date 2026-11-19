import { fireEvent, render, screen, within } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { limparAncoraDeCampo } from '../../provedores/utils/destaqueAncora'
import type { ModalDoVerbeteProps } from '../types/modalDoVerbete'
import { DicionarioDaVersao } from './DicionarioDaVersao'
import type { DicionarioDaVersaoProps } from './DicionarioDaVersao'

const { propsDoModal } = vi.hoisted(() => ({ propsDoModal: [] as ModalDoVerbeteProps[] }))

/**
 * Falso que honra o contrato do modal real: diálogo com o nome do campo, "Campo anterior",
 * "Próximo campo", "Fechar", rodapé "Campo N de M" e `devolverFoco` chamado uma vez, depois de o
 * diálogo sair do DOM. O modal real tem teste próprio e o `.integracao` o usa.
 */
vi.mock('./ModalDoVerbete', () => ({
  ModalDoVerbete: (props: ModalDoVerbeteProps) => {
    propsDoModal.push(props)

    const devolverFocoRef = useRef(props.devolverFoco)
    devolverFocoRef.current = props.devolverFoco
    useEffect(() => () => devolverFocoRef.current(), [])

    return (
      <div role="dialog" aria-modal="true" aria-label={props.campo.nome}>
        <p>{props.campo.significado}</p>
        <button
          type="button"
          onClick={() => props.anterior && props.onNavegar(props.anterior.slug)}
        >
          Campo anterior
        </button>
        <button type="button" onClick={() => props.proximo && props.onNavegar(props.proximo.slug)}>
          Próximo campo
        </button>
        <button type="button" onClick={props.onFechar}>
          Fechar
        </button>
        <p>
          Campo {props.posicao} de {props.total}
        </p>
      </div>
    )
  },
}))

vi.mock('../../provedores/utils/destaqueAncora', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../../provedores/utils/destaqueAncora')>()),
  limparAncoraDeCampo: vi.fn(),
}))

/**
 * Registros no formato do DTO do servidor (versão 4.13), sem anotação com o tipo do cliente. As
 * raízes chegam em Servico, Tomador, Prestador, Zeta (nem alfabética nem inversa), e o grupo
 * `Servico/Valores` chega depois de `Tomador`: o bloco "Serviço" junta os dois, e a ordem do DOM
 * difere da ordem de chegada. `Zeta` não tem rótulo cadastrado. `urlCanonica` nunca é o caminho
 * que um componente montaria à mão.
 */
const DISCRIMINACAO = {
  slug: 'servico-discriminacao',
  nome: 'Discriminacao',
  caminhoXml: '//Servico/Discriminacao',
  significado: 'Descrição do serviço prestado.',
  ordem: 148,
  reformaTributaria: false,
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
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
  urlCanonica: '/layout/campos/servico-paipreservico-canonico',
}

const VAL_SERVICOS = {
  slug: 'servico-valores-valservicos',
  nome: 'ValServicos',
  caminhoXml: '//Servico/Valores/ValServicos',
  significado: 'Valor dos serviços.',
  ordem: 160,
  reformaTributaria: false,
  novoNestaVersao: true,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/servico-valores-valservicos-canonico',
}

const VAL_PIS = {
  slug: 'servico-valores-valpis',
  nome: 'ValPIS',
  caminhoXml: '//Servico/Valores/ValPIS',
  significado: 'Valor do PIS.',
  ordem: 164,
  reformaTributaria: false,
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/servico-valores-valpis-canonico',
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
  urlCanonica: '/layout/campos/tomador-tomacnpj-canonico',
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
  urlCanonica: '/layout/campos/prestador-cnpj-prest-canonico',
}

const INSCRICAO_MUNICIPAL = {
  slug: 'prestador-im',
  nome: 'IM',
  caminhoXml: '//Prestador/IM',
  significado: 'Bloco removido do vocabulário.',
  ordem: 45,
  reformaTributaria: false,
  novoNestaVersao: false,
  descontinuadoNestaVersao: true,
  urlCanonica: '/layout/campos/prestador-im-canonico',
}

const CAMPO_ZETA = {
  slug: 'zeta-campo',
  nome: 'ZetaCampo',
  caminhoXml: '//Zeta/ZetaCampo',
  significado: 'Campo de uma raiz sem rótulo cadastrado.',
  ordem: 900,
  reformaTributaria: false,
  novoNestaVersao: false,
  descontinuadoNestaVersao: false,
  urlCanonica: '/layout/campos/zeta-campo-canonico',
}

const CAMPOS_POR_GRUPO = [
  { grupo: 'Servico', grupoSlug: 'servico', campos: [DISCRIMINACAO, PAI_PRE_SERVICO] },
  { grupo: 'Tomador', grupoSlug: 'tomador', campos: [TOMA_CNPJ] },
  { grupo: 'Servico/Valores', grupoSlug: 'servico-valores', campos: [VAL_SERVICOS, VAL_PIS] },
  { grupo: 'Prestador', grupoSlug: 'prestador', campos: [CNPJ_PRESTADOR, INSCRICAO_MUNICIPAL] },
  { grupo: 'Zeta', grupoSlug: 'zeta', campos: [CAMPO_ZETA] },
]

const ORIGEM = 'https://codex.migrate.info'

function propsDoDicionario(
  sobrescritas: Partial<DicionarioDaVersaoProps> = {},
): DicionarioDaVersaoProps {
  return {
    versaoRotulo: '4.13',
    totalCampos: 8,
    camposPorGrupo: CAMPOS_POR_GRUPO,
    origemUrl: ORIGEM,
    ...sobrescritas,
  }
}

function renderizar(sobrescritas: Partial<DicionarioDaVersaoProps> = {}) {
  const resultado = render(<DicionarioDaVersao {...propsDoDicionario(sobrescritas)} />)

  function rerenderizar(novas: Partial<DicionarioDaVersaoProps>) {
    resultado.rerender(<DicionarioDaVersao {...propsDoDicionario({ ...sobrescritas, ...novas })} />)
  }

  return { ...resultado, rerenderizar }
}

function buscar() {
  return screen.getByLabelText('Buscar por nome, caminho ou significado do campo')
}

function digitarBusca(texto: string) {
  fireEvent.change(buscar(), { target: { value: texto } })
}

/** Toda busca casa com "/": todos os caminhos começam com "//". Com filtro, vêm todos os blocos. */
function mostrarTodosOsBlocos() {
  digitarBusca('/')
}

function irAoBlocoPeloIndice(nome: RegExp) {
  const indice = screen.getByRole('navigation', { name: 'Blocos do layout' })
  fireEvent.click(within(indice).getByRole('link', { name: nome }))
}

function estadoDosBlocos(container: HTMLElement) {
  return Array.from(container.querySelectorAll('details')).map((bloco) => [bloco.id, bloco.open])
}

function nomesNaOrdemDoDom(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-botao-do-campo]')).map(
    (botao) => botao.textContent ?? '',
  )
}

function ultimasPropsDoModal(): ModalDoVerbeteProps {
  return propsDoModal[propsDoModal.length - 1]
}

const rolarParaOElemento = vi.fn()

beforeEach(() => {
  Element.prototype.scrollIntoView = rolarParaOElemento
  rolarParaOElemento.mockClear()
  vi.mocked(limparAncoraDeCampo).mockClear()
  propsDoModal.length = 0
})

describe('DicionarioDaVersao — conteúdo', () => {
  it('sem filtro mostra um bloco por vez, o primeiro, na ordem devolvida pelo backend', () => {
    const { container } = renderizar()

    expect(nomesNaOrdemDoDom(container)).toEqual([
      'Discriminacao',
      'PaiPreServico',
      'ValServicos',
      'ValPIS',
    ])
    expect(container.querySelector('details')).toBeNull()
  })

  it('com filtro, mostra os campos de todos os blocos na ordem do backend', () => {
    const { container } = renderizar()

    mostrarTodosOsBlocos()

    expect(nomesNaOrdemDoDom(container)).toEqual([
      'Discriminacao',
      'PaiPreServico',
      'ValServicos',
      'ValPIS',
      'TomaCNPJ',
      'CNPJ_prest',
      'IM',
      'ZetaCampo',
    ])
  })

  it('a seção é nomeada pelo título "Dicionário de campos"', () => {
    renderizar()

    expect(screen.getByRole('region', { name: 'Dicionário de campos' })).toBeInTheDocument()
  })

  it('o rótulo do bloco vem do cadastro de rótulos; raiz sem rótulo mostra o texto cru', () => {
    renderizar()

    const indice = screen.getByRole('navigation', { name: 'Blocos do layout' })
    const rotulos = within(indice)
      .getAllByRole('link')
      .map((link) => link.querySelector('span')?.textContent)

    expect(rotulos).toEqual(['Serviço', 'Tomador', 'Prestador', 'Zeta'])
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Serviço')
  })

  it('o subtítulo do subgrupo é a trilha dentro do bloco', () => {
    renderizar()

    expect(screen.getAllByRole('heading', { level: 4 }).map((t) => t.textContent)).toEqual([
      'Campos gerais',
      'Valores',
    ])
  })

  it('a meta do bloco diz quantos campos e quantos são novos nesta versão', () => {
    const { container } = renderizar()

    expect(container.querySelector('#bloco-Servico header')).toHaveTextContent('4 campos · 1 novo')

    irAoBlocoPeloIndice(/^Tomador/)
    const resumoDoTomador = container.querySelector('#bloco-Tomador header')!

    expect(resumoDoTomador).toHaveTextContent('1 campo')
    expect(resumoDoTomador).not.toHaveTextContent('novo')
  })

  it('com filtro, a meta mostra "v de n campos" e o número de novos continua o do bloco', () => {
    const { container } = renderizar()

    digitarBusca('valpis')

    expect(container.querySelector('#bloco-Servico summary')).toHaveTextContent(
      '1 de 4 campos · 1 novo',
    )
  })

  it('o campo novo e o descontinuado levam o texto, e só eles', () => {
    renderizar()
    mostrarTodosOsBlocos()

    expect(screen.getAllByText('novo na versão 4.13')).toHaveLength(1)
    expect(screen.getByRole('row', { name: /ValServicos/ })).toContainElement(
      screen.getByText('novo na versão 4.13'),
    )
    expect(screen.getAllByText('Descontinuado nesta versão')).toHaveLength(1)
    expect(screen.getByRole('row', { name: /IM/ })).toContainElement(
      screen.getByText('Descontinuado nesta versão'),
    )
  })

  it('não expõe nenhuma coluna de comportamento (vocabulário, não comportamento)', () => {
    renderizar()

    const nomes = new Set(screen.getAllByRole('columnheader').map((coluna) => coluna.textContent))

    expect(nomes).toEqual(new Set(['Campo', 'Significado', 'Abrir']))
    for (const rotuloProibido of ['Tipo', 'Tamanho', 'Máscara', 'Obrigatoriedade']) {
      expect(screen.queryByRole('columnheader', { name: rotuloProibido })).toBeNull()
    }
  })

  it('cada tabela tem uma legenda com a trilha do subgrupo', () => {
    renderizar()
    mostrarTodosOsBlocos()

    expect(screen.getByRole('table', { name: 'Campos de Serviço › Valores' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Campos de Tomador' })).toBeInTheDocument()
  })
})

describe('DicionarioDaVersao — frases e estados vazios', () => {
  it('sem filtro, conta os campos da versão numa região que se anuncia sozinha', () => {
    renderizar()

    const frase = screen.getByText('8 campos no vocabulário da versão 4.13.')

    expect(frase).toHaveAttribute('aria-live', 'polite')
    expect(frase).toHaveAttribute('aria-atomic', 'true')
  })

  it('no singular, escreve "1 campo"', () => {
    renderizar({ totalCampos: 1, camposPorGrupo: [{ ...CAMPOS_POR_GRUPO[4] }] })

    expect(screen.getByText('1 campo no vocabulário da versão 4.13.')).toBeInTheDocument()
  })

  it('com filtro, diz quantos campos aparecem de quantos', () => {
    renderizar()

    digitarBusca('tomacnpj')

    expect(screen.getByText('Mostrando 1 de 8 campos.')).toBeInTheDocument()
    expect(screen.queryByText(/no vocabulário da versão/)).toBeNull()
  })

  it('o rótulo que já traz "Versão" não gera "versão Versão"', () => {
    renderizar({ versaoRotulo: 'Versão 4.13' })

    expect(screen.getByText('8 campos no vocabulário da versão 4.13.')).toBeInTheDocument()
    expect(screen.getByText('novo na versão 4.13')).toBeInTheDocument()
  })

  it('versão sem campo algum diz isso, nomeado, e não mostra tabela em branco', () => {
    renderizar({ totalCampos: 0, camposPorGrupo: [] })

    expect(screen.getByText('A versão 4.13 ainda não tem campos publicados.')).toBeInTheDocument()
    expect(screen.queryByRole('row')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Blocos do layout' })).toBeNull()
  })

  it('busca sem resultado explica, oferece limpar, e limpar devolve tudo', () => {
    const { container } = renderizar()

    digitarBusca('zzz-inexistente')

    expect(
      screen.getByText('Nenhum campo da versão 4.13 corresponde a “zzz-inexistente”.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/O nome pode ser o do provedor, não o do layout\./)).toBeInTheDocument()
    expect(container.querySelector('details')).toBeNull()

    const botoes = screen.getAllByRole('button', { name: 'Limpar filtro' })
    expect(botoes).toHaveLength(2)
    fireEvent.click(botoes[botoes.length - 1])

    expect(nomesNaOrdemDoDom(container)).toHaveLength(4)
    expect(buscar()).toHaveValue('')
  })

  it('"Limpar filtro" só existe com termo digitado', () => {
    renderizar()
    expect(screen.queryByRole('button', { name: 'Limpar filtro' })).toBeNull()

    digitarBusca('cnpj')
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtro' }))

    expect(buscar()).toHaveValue('')
    expect(screen.getByText('8 campos no vocabulário da versão 4.13.')).toBeInTheDocument()
  })
})

describe('DicionarioDaVersao — busca', () => {
  it('acha pelo nome, pelo caminho e pelo significado, sem diferenciar acento nem caixa', () => {
    const { container } = renderizar()

    digitarBusca('TOMACNPJ')
    expect(nomesNaOrdemDoDom(container)).toEqual(['TomaCNPJ'])

    digitarBusca('prestador/im')
    expect(nomesNaOrdemDoDom(container)).toEqual(['IM'])

    digitarBusca('removido do vocabulario')
    expect(nomesNaOrdemDoDom(container)).toEqual(['IM'])

    digitarBusca('PAÍS DE PRESTAÇÃO')
    expect(nomesNaOrdemDoDom(container)).toEqual(['PaiPreServico'])
  })

  it('só renderiza os blocos que têm resultado, e o índice mantém os outros com 0', () => {
    const { container } = renderizar()

    digitarBusca('tomacnpj')

    expect(estadoDosBlocos(container)).toEqual([['bloco-Tomador', true]])

    const indice = screen.getByRole('navigation', { name: 'Blocos do layout' })
    expect(within(indice).getByRole('link', { name: 'Tomador 1 campo' })).toBeInTheDocument()
    expect(within(indice).queryByRole('link', { name: /Serviço/ })).toBeNull()
    expect(within(indice).getByText('Serviço')).toBeInTheDocument()
  })

  it('o campo achado em bloco que estava fechado abre o bloco', () => {
    const { container } = renderizar()
    expect(container.querySelector('#bloco-Prestador')).toBeNull()

    digitarBusca('prestador/im')

    expect(estadoDosBlocos(container)).toEqual([['bloco-Prestador', true]])
  })

  it('abre só os blocos com resultado, e limpar volta a um bloco por vez', () => {
    const { container } = renderizar()

    digitarBusca('cnpj')
    expect(estadoDosBlocos(container)).toEqual([
      ['bloco-Tomador', true],
      ['bloco-Prestador', true],
    ])

    digitarBusca('')

    expect(estadoDosBlocos(container)).toEqual([])
    expect(container.querySelector('section#bloco-Servico')).not.toBeNull()
  })
})

describe('DicionarioDaVersao — blocos e índice', () => {
  it('o rodapé leva ao bloco vizinho, rola até ele e põe o foco no título', () => {
    const { container } = renderizar()
    expect(screen.queryByRole('button', { name: /Bloco anterior/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Próximo bloco: Tomador' }))

    expect(nomesNaOrdemDoDom(container)).toEqual(['TomaCNPJ'])
    expect(rolarParaOElemento.mock.contexts[0]).toBe(container.querySelector('#bloco-Tomador'))
    expect(screen.getByRole('heading', { level: 3, name: 'Tomador' })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Bloco anterior: Serviço' }))
    expect(nomesNaOrdemDoDom(container)[0]).toBe('Discriminacao')
  })

  it('o último bloco não tem próximo', () => {
    renderizar()

    irAoBlocoPeloIndice(/^Zeta/)

    expect(screen.queryByRole('button', { name: /Próximo bloco/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Bloco anterior: Prestador' })).toBeInTheDocument()
  })

  it('"Expandir" e "Recolher todos" só existem com filtro, e valem para os blocos de resultado', () => {
    const { container } = renderizar()
    expect(screen.queryByRole('button', { name: 'Recolher todos' })).toBeNull()

    mostrarTodosOsBlocos()
    fireEvent.click(screen.getByRole('button', { name: 'Recolher todos' }))
    expect(estadoDosBlocos(container).map(([, aberto]) => aberto)).toEqual([
      false,
      false,
      false,
      false,
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }))
    expect(estadoDosBlocos(container).map(([, aberto]) => aberto)).toEqual([true, true, true, true])
  })

  it('o índice lista cada bloco com a contagem de campos', () => {
    renderizar()

    const indice = screen.getByRole('navigation', { name: 'Blocos do layout' })

    expect(
      within(indice)
        .getAllByRole('link')
        .map((link) => link.textContent?.replace(/\s+/g, ' ').trim()),
    ).toEqual(['Serviço +1 novo 4 campos', 'Tomador 1 campo', 'Prestador 2 campos', 'Zeta 1 campo'])
  })

  it('clicar no índice mostra o bloco, marca-o como atual e põe o foco no título', () => {
    const { container } = renderizar()
    expect(screen.getByRole('link', { name: /^Serviço/ })).toHaveAttribute(
      'aria-current',
      'location',
    )

    fireEvent.click(screen.getByRole('link', { name: 'Prestador 2 campos' }))

    const bloco = container.querySelector('#bloco-Prestador')!
    expect(container.querySelector('#bloco-Servico')).toBeNull()
    expect(rolarParaOElemento.mock.contexts[0]).toBe(bloco)
    expect(within(bloco as HTMLElement).getByRole('heading', { level: 3 })).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Prestador 2 campos' })).toHaveAttribute(
      'aria-current',
      'location',
    )
    expect(screen.getByRole('link', { name: /^Serviço/ })).not.toHaveAttribute('aria-current')
  })

  it('com filtro, o índice rola até o bloco recolhível e nenhum fica marcado como atual', () => {
    const { container } = renderizar()
    mostrarTodosOsBlocos()

    fireEvent.click(screen.getByRole('link', { name: 'Prestador 2 campos' }))

    const bloco = container.querySelector<HTMLDetailsElement>('#bloco-Prestador')!
    expect(bloco.open).toBe(true)
    expect(bloco.querySelector('summary')).toHaveFocus()
    expect(document.querySelector('[aria-current="location"]')).toBeNull()
  })
})

describe('DicionarioDaVersao — modal do campo', () => {
  it('clicar no nome abre o modal com o significado completo e a posição na ordem do DOM', () => {
    renderizar()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'ValServicos' }))

    expect(screen.getByRole('dialog', { name: 'ValServicos' })).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText('Valor dos serviços.')).toBeInTheDocument()
    expect(screen.getByText('Campo 3 de 8')).toBeInTheDocument()
  })

  it('entrega ao modal trilha, vizinhos pelo slug, rótulo da versão e o link canônico', () => {
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'ValServicos' }))

    const props = ultimasPropsDoModal()
    expect(props.trilha).toBe('Serviço › Valores')
    expect(props.versaoRotulo).toBe('4.13')
    expect(props.posicao).toBe(3)
    expect(props.total).toBe(8)
    expect(props.filtroAtivo).toBe(false)
    expect(props.anterior).toEqual({ slug: 'servico-paipreservico', nome: 'PaiPreServico' })
    expect(props.proximo).toEqual({ slug: 'servico-valores-valpis', nome: 'ValPIS' })
    expect(props.linkDoCampo).toBe(
      'https://codex.migrate.info/layout/campos/servico-valores-valservicos-canonico',
    )
  })

  it('clicar na linha, fora de botão, também abre o modal', () => {
    const { container } = renderizar()

    fireEvent.click(
      container.querySelector('#campo-servico-discriminacao [data-coluna="caminho"]')!,
    )

    expect(screen.getByRole('dialog', { name: 'Discriminacao' })).toBeInTheDocument()
  })

  it('o primeiro e o último campo não têm vizinho do lado de fora', () => {
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Discriminacao' }))
    expect(ultimasPropsDoModal().anterior).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    irAoBlocoPeloIndice(/^Zeta/)
    fireEvent.click(screen.getByRole('button', { name: 'ZetaCampo' }))
    expect(ultimasPropsDoModal().proximo).toBeNull()
    expect(ultimasPropsDoModal().posicao).toBe(8)
  })

  it('com busca ativa, posição e total seguem a sequência filtrada', () => {
    renderizar()

    digitarBusca('cnpj')
    fireEvent.click(screen.getByRole('button', { name: 'CNPJ_prest' }))

    const props = ultimasPropsDoModal()
    expect(props.posicao).toBe(2)
    expect(props.total).toBe(2)
    expect(props.filtroAtivo).toBe(true)
    expect(props.anterior?.slug).toBe('tomador-tomacnpj')
    expect(props.proximo).toBeNull()
  })

  it('navegar para um campo de outro bloco mostra esse bloco, e fechar devolve o foco a ele', () => {
    const { container } = renderizar()
    expect(container.querySelector('#bloco-Tomador')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'ValPIS' }))
    fireEvent.click(screen.getByRole('button', { name: 'Próximo campo' }))

    expect(screen.getByRole('dialog', { name: 'TomaCNPJ' })).toBeInTheDocument()
    expect(container.querySelector('#bloco-Tomador')).not.toBeNull()
    expect(container.querySelector('#bloco-Servico')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(container.querySelector('#bloco-Tomador')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'TomaCNPJ' })).toHaveFocus()
  })

  it('fechar devolve o foco ao botão da linha do campo em que o modal terminou', () => {
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Discriminacao' }))
    fireEvent.click(screen.getByRole('button', { name: 'Próximo campo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Próximo campo' }))
    expect(screen.getByRole('dialog', { name: 'ValServicos' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'ValServicos' })).toHaveFocus()
  })
})

describe('DicionarioDaVersao — campo ativo', () => {
  function linhasAtivas() {
    return document.querySelectorAll('[aria-current="true"]')
  }

  it('só uma linha é a atual, em qualquer momento, e a marca persiste depois de fechar', () => {
    renderizar()
    expect(linhasAtivas()).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Discriminacao' }))
    expect(linhasAtivas()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Discriminacao' })).toHaveAttribute(
      'aria-current',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Próximo campo' }))
    expect(linhasAtivas()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'PaiPreServico' })).toHaveAttribute(
      'aria-current',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(linhasAtivas()).toHaveLength(1)
    expect(document.querySelectorAll('tr.bg-highlight-anchor')).toHaveLength(1)
  })
})

describe('DicionarioDaVersao — campo apontado por âncora', () => {
  it('abre o bloco, rola até a linha, abre o modal e marca a linha', () => {
    const { container } = renderizar({ campoDestacado: 'prestador-im' })

    expect(container.querySelector('#bloco-Prestador')).not.toBeNull()
    expect(container.querySelector('#bloco-Servico')).toBeNull()
    expect(screen.getByRole('dialog', { name: 'IM' })).toBeInTheDocument()
    expect(rolarParaOElemento).toHaveBeenCalledExactlyOnceWith({ block: 'center' })
    expect(rolarParaOElemento.mock.contexts[0]).toBe(container.querySelector('#campo-prestador-im'))
    expect(screen.getByRole('button', { name: 'IM' })).toHaveAttribute('aria-current', 'true')
  })

  it('limpa a busca que esconde o campo apontado, antes de abrir o modal', () => {
    const { container, rerenderizar } = renderizar()
    digitarBusca('valpis')
    expect(container.querySelector('#campo-tomador-tomacnpj')).toBeNull()

    rerenderizar({ campoDestacado: 'tomador-tomacnpj' })

    expect(buscar()).toHaveValue('')
    expect(container.querySelector('#campo-tomador-tomacnpj')).not.toBeNull()
    expect(screen.getByRole('dialog', { name: 'TomaCNPJ' })).toBeInTheDocument()
  })

  it('slug que não existe na versão não abre nada nem rola', () => {
    renderizar({ campoDestacado: 'campo-que-nao-existe' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(rolarParaOElemento).not.toHaveBeenCalled()
    expect(document.querySelectorAll('[aria-current="true"]')).toHaveLength(0)
  })

  it('fechar o modal aberto por âncora limpa a âncora; aberto por clique, não mexe na URL', () => {
    const { unmount } = renderizar({ campoDestacado: 'prestador-im' })
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(limparAncoraDeCampo).toHaveBeenCalledTimes(1)
    unmount()

    vi.mocked(limparAncoraDeCampo).mockClear()
    renderizar({ campoDestacado: null })
    irAoBlocoPeloIndice(/^Prestador/)
    fireEvent.click(screen.getByRole('button', { name: 'IM' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(limparAncoraDeCampo).not.toHaveBeenCalled()
  })
})

describe('DicionarioDaVersao — só campos da reforma tributária', () => {
  const COM_REFORMA = CAMPOS_POR_GRUPO.map((grupo) => ({
    ...grupo,
    campos: grupo.campos.map((campo) =>
      campo === TOMA_CNPJ || campo === VAL_PIS ? { ...campo, reformaTributaria: true } : campo,
    ),
  }))

  function botaoDaReforma() {
    return screen.getByRole('button', { name: 'Só reforma tributária' })
  }

  it('mostra só os campos da reforma, com o selo, e limpar devolve o dicionário inteiro', () => {
    const { container } = renderizar({ camposPorGrupo: COM_REFORMA })

    fireEvent.click(botaoDaReforma())

    expect(botaoDaReforma()).toHaveAttribute('aria-pressed', 'true')
    expect(nomesNaOrdemDoDom(container)).toEqual(['ValPIS', 'TomaCNPJ'])
    expect(screen.getByText('Mostrando 2 de 8 campos.')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-selo-reforma-tributaria]')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtro' }))

    expect(botaoDaReforma()).toHaveAttribute('aria-pressed', 'false')
    expect(nomesNaOrdemDoDom(container)).toHaveLength(4)
  })

  it('o termo continua valendo dentro dos campos da reforma', () => {
    const { container } = renderizar({ camposPorGrupo: COM_REFORMA })

    fireEvent.click(botaoDaReforma())
    digitarBusca('toma')

    expect(nomesNaOrdemDoDom(container)).toEqual(['TomaCNPJ'])
  })

  it('versão sem campo da reforma diz isso, sem a dica de nome do provedor', () => {
    renderizar()

    fireEvent.click(botaoDaReforma())

    expect(
      screen.getByText('Nenhum campo da versão 4.13 é da reforma tributária.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/O nome pode ser o do provedor/)).not.toBeInTheDocument()
  })
})

describe('DicionarioDaVersao: só o que mudou', () => {
  function opcao(rotulo: 'Layout completo' | 'Só o que mudou') {
    return screen.getByRole('radio', { name: rotulo })
  }

  it('sem versão anterior, o alternador não aparece', () => {
    renderizar()

    expect(screen.queryByRole('radiogroup', { name: 'O que mostrar' })).not.toBeInTheDocument()
  })

  it('blocos sem campo novo somem, o índice acompanha, e "Layout completo" devolve tudo', () => {
    const { container } = renderizar({ temVersaoAnterior: true })

    expect(opcao('Layout completo')).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(opcao('Só o que mudou'))

    expect(opcao('Só o que mudou')).toHaveAttribute('aria-checked', 'true')
    expect(opcao('Layout completo')).toHaveAttribute('aria-checked', 'false')
    expect(nomesNaOrdemDoDom(container)).toEqual(['ValServicos'])
    expect(estadoDosBlocos(container)).toEqual([['bloco-Servico', true]])
    expect(screen.getByText('Mostrando 1 de 8 campos.')).toBeInTheDocument()

    const indice = screen.getByRole('navigation', { name: 'Blocos do layout' })
    expect(within(indice).getAllByRole('listitem')).toHaveLength(1)
    expect(
      within(indice).getByRole('link', { name: 'Serviço +1 novo 1 campo' }),
    ).toBeInTheDocument()

    fireEvent.click(opcao('Layout completo'))

    expect(nomesNaOrdemDoDom(container)).toHaveLength(4)
  })

  it('combinado com a busca, sem sobra diz "Nenhum campo com esses filtros." e limpar volta', () => {
    const { container } = renderizar({ temVersaoAnterior: true })

    fireEvent.click(opcao('Só o que mudou'))
    digitarBusca('tomacnpj')

    expect(screen.getByText('Nenhum campo com esses filtros.')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Limpar filtro' })[0])

    expect(opcao('Layout completo')).toHaveAttribute('aria-checked', 'true')
    expect(nomesNaOrdemDoDom(container)).toHaveLength(4)
  })
})
