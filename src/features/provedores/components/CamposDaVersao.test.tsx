import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModalDoCampoProps } from '../types/modalDoCampo'
import { limparAncoraDeCampo } from '../utils/destaqueAncora'
import { CamposDaVersao } from './CamposDaVersao'
import type { CamposDaVersaoProps } from './CamposDaVersao'

const { propsDoModal, seloVerificacaoSpy } = vi.hoisted(() => ({
  propsDoModal: [] as ModalDoCampoProps[],
  seloVerificacaoSpy: vi.fn(),
}))

/**
 * Falso que honra o contrato do modal real: diálogo com o nome do campo, botões "Campo anterior",
 * "Próximo campo" e "Fechar", rodapé "Campo N de M" e `devolverFoco` chamado uma vez, depois de o
 * diálogo sair do DOM. O modal real tem teste próprio.
 */
vi.mock('./ModalDoCampo', () => ({
  ModalDoCampo: (props: ModalDoCampoProps) => {
    propsDoModal.push(props)

    const devolverFocoRef = useRef(props.devolverFoco)
    devolverFocoRef.current = props.devolverFoco
    useEffect(() => () => devolverFocoRef.current(), [])

    return (
      <div role="dialog" aria-modal="true" aria-label={props.campo.nome}>
        <button
          type="button"
          onClick={() => props.anterior && props.onNavegar(props.anterior.campoLayoutSlug)}
        >
          Campo anterior
        </button>
        <button
          type="button"
          onClick={() => props.proximo && props.onNavegar(props.proximo.campoLayoutSlug)}
        >
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

vi.mock('../../../components/ui/SeloVerificacao', () => ({
  SeloVerificacao: (props: { data: string; nota?: string }) => {
    seloVerificacaoSpy(props)
    return <p data-testid="selo-verificacao">selo de verificação</p>
  },
}))

vi.mock('../utils/destaqueAncora', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../utils/destaqueAncora')>()),
  limparAncoraDeCampo: vi.fn(),
}))

/**
 * Registros copiados da resposta da API (Emissor Nacional 0.20), sem anotação com o tipo do
 * cliente. Raízes na ordem Servico, Tomador, Prestador (nem alfabética nem inversa) e o grupo
 * `Servico/Valores` vem depois de `Tomador`: o bloco "Serviço" junta os dois, e a ordem do DOM
 * difere da ordem de chegada. O caminho no XML nunca é igual ao destino. Os exemplos e o destino
 * omitido ainda não existem na API; cada registro só difere do real nesses campos.
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
  destinoXml: 'DPS/infDPS/serv/cServ/xDescServ',
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
    { slug: 'e0591-nao-e-permitido-informar-o-codigo-do-pais', codigo: 'E0591' },
  ],
}

const VAL_SERVICOS = {
  ...BASE_DO_CAMPO,
  campoLayoutSlug: 'servico-valores-valservicos',
  reformaTributaria: false,
  nome: 'ValServicos',
  caminhoXml: '//Servico/Valores/ValServicos',
  significado: 'Valor dos serviços.',
  tipo: 'Numérico',
  tamanho: '1 a 15 dígitos inteiros, com 2 decimais',
  estadoPreenchimento: 'Obrigatorio' as const,
  destinoXml: 'DPS/infDPS/valores/vServPrest/vServ',
  ordem: 160,
  errosConhecidos: [{ slug: 'e0623-valor-do-servico-invalido', codigo: 'E0623' }],
}

const VAL_PIS = {
  ...BASE_DO_CAMPO,
  campoLayoutSlug: 'servico-valores-valpis',
  reformaTributaria: false,
  nome: 'ValPIS',
  caminhoXml: '//Servico/Valores/ValPIS',
  significado: 'Valor do PIS.',
  tipo: 'Numérico',
  tamanho: '1 a 15 dígitos inteiros, com 2 decimais',
  estadoPreenchimento: 'Opcional' as const,
  exemplo: '12.50',
  destinoXml: 'DPS/infDPS/valores/trib/tribFed/piscofins/vPis',
  ordem: 164,
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
  estadoPreenchimento: 'Condicional' as const,
  destinoXml: 'DPS/infDPS/toma/CNPJ',
  ordem: 330,
}

const TOMA_CEP = {
  ...BASE_DO_CAMPO,
  campoLayoutSlug: 'tomador-tomacep',
  reformaTributaria: false,
  nome: 'TomaCEP',
  caminhoXml: '//Tomador/TomaCEP',
  significado: 'CEP do tomador.',
  tipo: 'Texto',
  tamanho: '8',
  estadoPreenchimento: 'Condicional' as const,
  destinoXml: 'DPS/infDPS/toma/end/endNac/CEP | DPS/infDPS/toma/end/endExt/cEndPost',
  ordem: 337,
}

const CNPJ_PRESTADOR = {
  ...BASE_DO_CAMPO,
  campoLayoutSlug: 'prestador-cnpj-prest',
  reformaTributaria: false,
  nome: 'CNPJ_prest',
  caminhoXml: '//Prestador/CNPJ_prest',
  significado: 'CNPJ do prestador.',
  tipo: 'Texto',
  tamanho: '14',
  estadoPreenchimento: 'Condicional' as const,
  destinoXml: 'DPS/infDPS/prest/CNPJ | DPS/infDPS/prest/CPF',
  ordem: 44,
}

const INSCRICAO_MUNICIPAL = {
  ...BASE_DO_CAMPO,
  campoLayoutSlug: 'prestador-im',
  reformaTributaria: false,
  nome: 'IM',
  caminhoXml: '//Prestador/IM',
  significado: 'Inscrição municipal do prestador.',
  tipo: 'Texto',
  tamanho: '15',
  estadoPreenchimento: 'Opcional' as const,
  destinoXml: 'DPS/infDPS/prest/IM',
  ordem: 45,
}

const CAMPOS_POR_GRUPO = [
  { grupo: 'Servico', grupoSlug: 'servico', campos: [DISCRIMINACAO, PAI_PRE_SERVICO] },
  { grupo: 'Tomador', grupoSlug: 'tomador', campos: [TOMA_CNPJ, TOMA_CEP] },
  { grupo: 'Servico/Valores', grupoSlug: 'servico-valores', campos: [VAL_SERVICOS, VAL_PIS] },
  { grupo: 'Prestador', grupoSlug: 'prestador', campos: [CNPJ_PRESTADOR, INSCRICAO_MUNICIPAL] },
]

const ERROS_RESUMO = [
  {
    slug: 'e0304-informe-um-codigo-de-pais-existente',
    codigo: 'E0304',
    titulo: 'Informe um código de país existente.',
    variantes: ['Informe um código de país existente.'],
  },
]

const URL_DA_VERSAO = 'https://codex.migrate.info/provedores/emissor-nacional/0-20'

const FRASE_SEM_FILTRO =
  'Esta tabela é exaustiva: o que não está aqui não se aplica a Emissor Nacional 0.20.'

function propsDaVersao(sobrescritas: Partial<CamposDaVersaoProps> = {}): CamposDaVersaoProps {
  return {
    provedorNome: 'Emissor Nacional',
    versaoRotulo: '0.20',
    verificadoEm: '2026-07-01T00:00:00Z',
    totalCampos: 8,
    camposPorGrupo: CAMPOS_POR_GRUPO,
    errosResumo: ERROS_RESUMO,
    urlProvedorAbsoluta: URL_DA_VERSAO,
    ...sobrescritas,
  }
}

function renderizar(sobrescritas: Partial<CamposDaVersaoProps> = {}) {
  const resultado = render(<CamposDaVersao {...propsDaVersao(sobrescritas)} />)

  function rerenderizar(novas: Partial<CamposDaVersaoProps>) {
    resultado.rerender(<CamposDaVersao {...propsDaVersao({ ...sobrescritas, ...novas })} />)
  }

  return { ...resultado, rerenderizar }
}

function buscar() {
  return screen.getByLabelText('Buscar campo do InvoiCy, tag do provedor ou caminho no XML')
}

function digitarBusca(texto: string) {
  fireEvent.change(buscar(), { target: { value: texto } })
}

function chip(nome: RegExp) {
  const grupo = screen.getByRole('group', { name: 'Filtrar por obrigatoriedade' })
  return within(grupo).getByRole('button', { name: nome })
}

function estadoDosBlocos(container: HTMLElement) {
  return Array.from(container.querySelectorAll('details')).map((bloco) => [bloco.id, bloco.open])
}

function ultimasPropsDoModal(): ModalDoCampoProps {
  return propsDoModal[propsDoModal.length - 1]
}

const rolarParaOElemento = vi.fn()

beforeEach(() => {
  Element.prototype.scrollIntoView = rolarParaOElemento
  rolarParaOElemento.mockClear()
  seloVerificacaoSpy.mockClear()
  vi.mocked(limparAncoraDeCampo).mockClear()
  propsDoModal.length = 0
})

describe('CamposDaVersao: afirmação de exaustividade e selo', () => {
  it('sem filtro, afirma a exaustividade da versão inteira, numa região que se anuncia sozinha', () => {
    renderizar()

    const frase = screen.getByText(FRASE_SEM_FILTRO)

    expect(frase).toHaveAttribute('aria-live', 'polite')
    expect(frase).toHaveAttribute('aria-atomic', 'true')
  })

  it('com filtro, diz quantos campos aparecem e que a exaustividade vale para a versão', () => {
    renderizar()

    digitarBusca('cnpj')

    expect(
      screen.getByText(
        'Mostrando 2 de 8 campos. A exaustividade vale para os 8 campos desta versão, não para este filtro.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(FRASE_SEM_FILTRO)).toBeNull()
  })

  it('o selo de verificação recebe as mesmas props com e sem filtro', () => {
    renderizar()
    const chamadasSemFiltro = seloVerificacaoSpy.mock.calls.length

    digitarBusca('cnpj')

    expect(seloVerificacaoSpy.mock.calls.length).toBeGreaterThan(chamadasSemFiltro)
    for (const [props] of seloVerificacaoSpy.mock.calls) {
      expect(props).toEqual({ data: '2026-07-01T00:00:00Z' })
    }
  })

  it('sem data de verificação, não mostra o selo', () => {
    renderizar({ verificadoEm: null })

    expect(screen.queryByTestId('selo-verificacao')).toBeNull()
  })
})

describe('CamposDaVersao: filtros', () => {
  it('os chips mostram a contagem da versão inteira e só um está pressionado', () => {
    renderizar()
    const grupo = screen.getByRole('group', { name: 'Filtrar por obrigatoriedade' })

    expect(
      within(grupo)
        .getAllByRole('button')
        .map((botao) => botao.textContent),
    ).toEqual(['Todos 8', 'Obrigatórios 2', 'Condicionais 4', 'Opcionais 2'])
    expect(grupo.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1)
    expect(chip(/Todos/)).toHaveAttribute('aria-pressed', 'true')
  })

  it('o chip esconde os campos de outro estado e a contagem dos chips não muda', () => {
    renderizar()

    fireEvent.click(chip(/Opcionais/))

    expect(chip(/Opcionais/)).toHaveAttribute('aria-pressed', 'true')
    expect(chip(/Todos/)).toHaveAttribute('aria-pressed', 'false')
    expect(chip(/Todos/)).toHaveTextContent('Todos 8')
    expect(screen.getByRole('button', { name: 'ValPIS' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Discriminacao' })).toBeNull()
    expect(screen.getByText(/Mostrando 2 de 8 campos/)).toBeInTheDocument()
  })

  it('a busca não altera a contagem dos chips, que é da versão inteira', () => {
    renderizar()

    digitarBusca('cnpj')

    const grupo = screen.getByRole('group', { name: 'Filtrar por obrigatoriedade' })
    expect(
      within(grupo)
        .getAllByRole('button')
        .map((botao) => botao.textContent),
    ).toEqual(['Todos 8', 'Obrigatórios 2', 'Condicionais 4', 'Opcionais 2'])
  })

  it('chip e busca se combinam', () => {
    renderizar()

    fireEvent.click(chip(/Condicionais/))
    digitarBusca('cnpj')

    expect(screen.getByRole('button', { name: 'TomaCNPJ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CNPJ_prest' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'IM' })).toBeNull()

    digitarBusca('cep')

    expect(screen.getByRole('button', { name: 'TomaCEP' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'TomaCNPJ' })).toBeNull()
  })

  it('"Limpar filtros" aparece só com filtro ativo e volta tudo ao estado inicial', () => {
    renderizar()
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull()

    fireEvent.click(chip(/Opcionais/))
    digitarBusca('valpis')
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(buscar()).toHaveValue('')
    expect(chip(/Todos/)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(FRASE_SEM_FILTRO)).toBeInTheDocument()
  })

  it('filtro sem resultado mostra o vazio com botão para limpar', () => {
    renderizar()

    digitarBusca('zzzz')

    expect(screen.getByText('Nenhum campo encontrado para esse filtro.')).toBeInTheDocument()
    const botoes = screen.getAllByRole('button', { name: 'Limpar filtros' })
    expect(botoes).toHaveLength(2)

    fireEvent.click(botoes[botoes.length - 1])

    expect(screen.queryByText('Nenhum campo encontrado para esse filtro.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Discriminacao' })).toBeInTheDocument()
  })

  it('versão sem campo algum diz isso, sem oferecer limpar filtros', () => {
    renderizar({ totalCampos: 0, camposPorGrupo: [] })

    expect(screen.getByText('Esta versão ainda não tem campos publicados.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull()
    expect(screen.queryByText('Nenhum campo encontrado para esse filtro.')).toBeNull()
  })
})

describe('CamposDaVersao: blocos', () => {
  it('lista os blocos na ordem da primeira aparição, só o primeiro aberto', () => {
    const { container } = renderizar()

    expect(estadoDosBlocos(container)).toEqual([
      ['bloco-Servico', true],
      ['bloco-Tomador', false],
      ['bloco-Prestador', false],
    ])
  })

  it('filtrar abre o bloco com resultado e manter o que já estava aberto ao limpar', () => {
    const { container } = renderizar()

    digitarBusca('tomacnpj')
    expect(estadoDosBlocos(container)).toEqual([['bloco-Tomador', true]])

    digitarBusca('')

    expect(estadoDosBlocos(container)).toEqual([
      ['bloco-Servico', true],
      ['bloco-Tomador', true],
      ['bloco-Prestador', false],
    ])
  })

  it('o resultado que está só num bloco fechado o abre', () => {
    const { container } = renderizar()

    fireEvent.click(chip(/Opcionais/))

    expect(estadoDosBlocos(container)).toEqual([
      ['bloco-Servico', true],
      ['bloco-Prestador', true],
    ])
  })

  it('"Expandir todos" abre todos e "Recolher todos" fecha todos', () => {
    const { container } = renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }))
    expect(estadoDosBlocos(container).map(([, aberto]) => aberto)).toEqual([true, true, true])

    fireEvent.click(screen.getByRole('button', { name: 'Recolher todos' }))
    expect(estadoDosBlocos(container).map(([, aberto]) => aberto)).toEqual([false, false, false])
  })

  it('o navegador abrindo o bloco (Ctrl+F) mantém o estado em dia', () => {
    const { container } = renderizar()
    const bloco = container.querySelector<HTMLDetailsElement>('#bloco-Prestador')!

    bloco.open = true
    fireEvent(bloco, new Event('toggle'))

    // Filtrar tira o bloco da tela e limpar o devolve: ele volta com o estado guardado.
    digitarBusca('tomacnpj')
    digitarBusca('')

    expect(estadoDosBlocos(container)).toEqual([
      ['bloco-Servico', true],
      ['bloco-Tomador', true],
      ['bloco-Prestador', true],
    ])
  })

  it('clicar no índice abre o bloco, rola até ele e põe o foco no resumo, sem mexer no hash', () => {
    const { container } = renderizar()

    fireEvent.click(screen.getByRole('link', { name: 'Tomador 2 campos' }))

    const bloco = container.querySelector<HTMLDetailsElement>('#bloco-Tomador')!
    expect(bloco.open).toBe(true)
    expect(rolarParaOElemento).toHaveBeenCalledExactlyOnceWith({ block: 'start' })
    expect(rolarParaOElemento.mock.contexts[0]).toBe(bloco)
    expect(bloco.querySelector('summary')).toHaveFocus()
    expect(window.location.hash).toBe('')
  })

  it('o índice conta os campos do bloco que passam no filtro e não faz link do que ficou com 0', () => {
    renderizar()

    expect(screen.getByRole('link', { name: 'Serviço 4 campos' })).toBeInTheDocument()

    digitarBusca('tomacnpj')

    const indice = screen.getByRole('navigation', { name: 'Blocos do layout' })
    expect(within(indice).getByRole('link', { name: 'Tomador 1 campo' })).toBeInTheDocument()
    expect(within(indice).queryByRole('link', { name: /Serviço/ })).toBeNull()
    expect(within(indice).getByText('Serviço')).toBeInTheDocument()
  })
})

describe('CamposDaVersao: modal do campo', () => {
  it('clicar no nome abre o diálogo com o nome do campo e entrega ao modal a posição na ordem do DOM', () => {
    renderizar()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'PaiPreServico' }))

    expect(screen.getByRole('dialog', { name: 'PaiPreServico' })).toBeInTheDocument()
    expect(screen.getByText('Campo 2 de 8')).toBeInTheDocument()

    const props = ultimasPropsDoModal()
    expect(props.posicao).toBe(2)
    expect(props.total).toBe(8)
    expect(props.trilha).toBe('Serviço › Campos gerais')
    expect(props.filtroAtivo).toBe(false)
    expect(props.anterior).toEqual({
      campoLayoutSlug: 'servico-discriminacao',
      nome: 'Discriminacao',
    })
    expect(props.proximo).toEqual({
      campoLayoutSlug: 'servico-valores-valservicos',
      nome: 'ValServicos',
    })
    expect(props.errosResumo).toBe(ERROS_RESUMO)
    expect(props.urlProvedorAbsoluta).toBe(URL_DA_VERSAO)
  })

  it('clicar na linha, fora de botão, também abre o diálogo', () => {
    const { container } = renderizar()

    fireEvent.click(container.querySelector('#campo-servico-discriminacao [data-coluna="tipo"]')!)

    expect(screen.getByRole('dialog', { name: 'Discriminacao' })).toBeInTheDocument()
  })

  it('o primeiro e o último campo não têm vizinho do lado de fora', () => {
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Discriminacao' }))
    expect(ultimasPropsDoModal().anterior).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    fireEvent.click(screen.getByRole('button', { name: 'IM' }))
    expect(ultimasPropsDoModal().proximo).toBeNull()
    expect(ultimasPropsDoModal().posicao).toBe(8)
  })

  it('com filtro ativo, posição e total seguem a sequência filtrada', () => {
    renderizar()

    fireEvent.click(chip(/Condicionais/))
    fireEvent.click(screen.getByRole('button', { name: 'TomaCNPJ' }))

    const props = ultimasPropsDoModal()
    expect(props.posicao).toBe(2)
    expect(props.total).toBe(4)
    expect(props.filtroAtivo).toBe(true)
    expect(props.anterior?.campoLayoutSlug).toBe('servico-paipreservico')
    expect(props.proximo?.campoLayoutSlug).toBe('tomador-tomacep')
    expect(screen.getByText('Campo 2 de 4')).toBeInTheDocument()
  })

  it('clicar no contador abre o modal na seção de rejeições; clicar na linha, não', () => {
    renderizar()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Ver as 3 rejeições registradas no campo PaiPreServico',
      }),
    )
    expect(ultimasPropsDoModal().campo.nome).toBe('PaiPreServico')
    expect(ultimasPropsDoModal().secaoInicial).toBe('rejeicoes')
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    fireEvent.click(screen.getByRole('button', { name: 'PaiPreServico' }))
    expect(ultimasPropsDoModal().secaoInicial).toBeUndefined()
  })

  it('navegar para um campo de bloco fechado abre o bloco', () => {
    const { container } = renderizar()
    expect(container.querySelector<HTMLDetailsElement>('#bloco-Tomador')!.open).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'ValPIS' }))
    fireEvent.click(screen.getByRole('button', { name: 'Próximo campo' }))

    expect(screen.getByRole('dialog', { name: 'TomaCNPJ' })).toBeInTheDocument()
    expect(container.querySelector<HTMLDetailsElement>('#bloco-Tomador')!.open).toBe(true)
  })

  it('navegar não leva a seção inicial junto', () => {
    renderizar()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Ver as 3 rejeições registradas no campo PaiPreServico',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Próximo campo' }))

    expect(ultimasPropsDoModal().campo.nome).toBe('ValServicos')
    expect(ultimasPropsDoModal().secaoInicial).toBeUndefined()
  })

  it('fechar devolve o foco ao botão da linha do campo em que o modal terminou, não ao que o abriu', () => {
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Discriminacao' }))
    fireEvent.click(screen.getByRole('button', { name: 'Próximo campo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Próximo campo' }))
    expect(screen.getByRole('dialog', { name: 'ValServicos' })).toBeInTheDocument()

    rolarParaOElemento.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'ValServicos' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Discriminacao' })).not.toHaveFocus()
    expect(rolarParaOElemento).toHaveBeenCalledExactlyOnceWith({ block: 'nearest' })
    expect(rolarParaOElemento.mock.contexts[0]).toBe(
      document.getElementById('campo-servico-valores-valservicos'),
    )
  })

  it('passa o erro resumo e a URL da versão ao modal', () => {
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'TomaCEP' }))

    expect(ultimasPropsDoModal().urlProvedorAbsoluta).toBe(
      'https://codex.migrate.info/provedores/emissor-nacional/0-20',
    )
  })
})

describe('CamposDaVersao: campo ativo', () => {
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
    expect(screen.getByRole('button', { name: 'PaiPreServico' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('a linha atual também ganha o fundo de destaque; as outras, não', () => {
    const { container } = renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'ValPIS' }))

    expect(container.querySelectorAll('tr.bg-highlight-anchor')).toHaveLength(1)
    expect(container.querySelector('#campo-servico-valores-valpis')).toHaveClass(
      'bg-highlight-anchor',
    )
  })
})

describe('CamposDaVersao: campo apontado por âncora', () => {
  it('abre o bloco, rola até a linha uma vez, abre o modal e marca a linha', () => {
    const { container } = renderizar({ campoDestacado: 'tomador-tomacep' })

    expect(container.querySelector<HTMLDetailsElement>('#bloco-Tomador')!.open).toBe(true)
    expect(screen.getByRole('dialog', { name: 'TomaCEP' })).toBeInTheDocument()
    expect(rolarParaOElemento).toHaveBeenCalledExactlyOnceWith({ block: 'center' })
    expect(rolarParaOElemento.mock.contexts[0]).toBe(
      container.querySelector('#campo-tomador-tomacep'),
    )
    expect(screen.getByRole('button', { name: 'TomaCEP' })).toHaveAttribute('aria-current', 'true')
    expect(ultimasPropsDoModal().secaoInicial).toBeUndefined()
  })

  it('limpa o chip que esconde o campo apontado, antes de abrir o modal', () => {
    const { container, rerenderizar } = renderizar()
    fireEvent.click(chip(/Opcionais/))
    expect(container.querySelector('#campo-tomador-tomacep')).toBeNull()

    rerenderizar({ campoDestacado: 'tomador-tomacep' })

    expect(chip(/Todos/)).toHaveAttribute('aria-pressed', 'true')
    expect(chip(/Opcionais/)).toHaveAttribute('aria-pressed', 'false')
    expect(container.querySelector('#campo-tomador-tomacep')).not.toBeNull()
    expect(screen.getByRole('dialog', { name: 'TomaCEP' })).toBeInTheDocument()
    expect(rolarParaOElemento).toHaveBeenCalledExactlyOnceWith({ block: 'center' })
  })

  it('limpa a busca que esconde o campo apontado, antes de abrir o modal', () => {
    const { container, rerenderizar } = renderizar()
    digitarBusca('valpis')
    expect(container.querySelector('#campo-tomador-tomacep')).toBeNull()

    rerenderizar({ campoDestacado: 'tomador-tomacep' })

    expect(buscar()).toHaveValue('')
    expect(container.querySelector('#campo-tomador-tomacep')).not.toBeNull()
    expect(screen.getByRole('dialog', { name: 'TomaCEP' })).toBeInTheDocument()
  })

  it('mantém o filtro que não esconde o campo apontado', () => {
    const { rerenderizar } = renderizar()
    fireEvent.click(chip(/Condicionais/))
    digitarBusca('pais')

    rerenderizar({ campoDestacado: 'servico-paipreservico' })

    expect(chip(/Condicionais/)).toHaveAttribute('aria-pressed', 'true')
    expect(buscar()).toHaveValue('pais')
    expect(screen.getByRole('dialog', { name: 'PaiPreServico' })).toBeInTheDocument()
  })

  it('digitar um filtro depois de chegar não rola de novo nem desfaz o filtro', () => {
    renderizar({ campoDestacado: 'tomador-tomacep' })
    expect(rolarParaOElemento).toHaveBeenCalledTimes(1)

    digitarBusca('toma')

    expect(buscar()).toHaveValue('toma')
    expect(rolarParaOElemento).toHaveBeenCalledTimes(1)
  })

  it('o mesmo slug não rola de novo; sair da âncora e voltar rola outra vez', () => {
    const { rerenderizar } = renderizar({ campoDestacado: 'tomador-tomacep' })

    rerenderizar({ campoDestacado: 'tomador-tomacep' })
    expect(rolarParaOElemento).toHaveBeenCalledTimes(1)

    rerenderizar({ campoDestacado: null })
    rerenderizar({ campoDestacado: 'tomador-tomacep' })
    expect(rolarParaOElemento).toHaveBeenCalledTimes(2)
  })

  it('slug que não existe na versão não abre nada nem rola', () => {
    renderizar({ campoDestacado: 'campo-que-nao-existe' })

    expect(screen.getByRole('heading', { name: 'Campos e mapeamento' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(rolarParaOElemento).not.toHaveBeenCalled()
    expect(document.querySelectorAll('[aria-current="true"]')).toHaveLength(0)
  })

  it('fechar o modal aberto por âncora limpa a âncora da URL', () => {
    renderizar({ campoDestacado: 'tomador-tomacep' })

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(limparAncoraDeCampo).toHaveBeenCalledTimes(1)
  })

  it('fechar o modal aberto por clique, sem âncora, não mexe na URL', () => {
    renderizar({ campoDestacado: null })

    fireEvent.click(screen.getByRole('button', { name: 'TomaCEP' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(limparAncoraDeCampo).not.toHaveBeenCalled()
  })
})

describe('CamposDaVersao: teclado e leitor de tela', () => {
  it('o botão do nome é alcançável por Tab e abre o diálogo com Enter', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const botao = screen.getByRole('button', { name: 'Discriminacao' })

    botao.focus()
    await usuario.keyboard('{Enter}')

    expect(screen.getByRole('dialog', { name: 'Discriminacao' })).toBeInTheDocument()
  })

  it('o título da seção nomeia a região', () => {
    renderizar()

    expect(screen.getByRole('region', { name: 'Campos e mapeamento' })).toBeInTheDocument()
  })
})

describe('CamposDaVersao: legenda da tabela', () => {
  it('explica por escrito cada marca, com quantos campos têm rejeição registrada', () => {
    renderizar()

    const legenda = screen.getByRole('list', { name: 'Legenda:' })
    expect(
      within(legenda)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'obrigatório',
      'condicional',
      'opcional',
      'ncampo com rejeição registrada nesta versão, n é a quantidade (2 campos)',
    ])
  })

  it('com campo da reforma tributária, a legenda explica o selo RT', () => {
    renderizar({
      camposPorGrupo: [
        {
          grupo: 'Servico',
          grupoSlug: 'servico',
          campos: [{ ...DISCRIMINACAO, reformaTributaria: true }],
        },
      ],
      totalCampos: 1,
    })

    const legenda = screen.getByRole('list', { name: 'Legenda:' })
    expect(within(legenda).getByText('campo da reforma tributária (IBS/CBS)')).toBeInTheDocument()
    // Sem campo com rejeição, a marca do triângulo não entra.
    expect(within(legenda).queryByText(/rejeição registrada/)).not.toBeInTheDocument()
  })
})
