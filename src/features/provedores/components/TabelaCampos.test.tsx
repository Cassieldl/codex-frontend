import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GrupoCampoVersao } from '../types/versaoProvedorPagina'
import { TabelaCampos } from './TabelaCampos'

const mockSeloVerificacaoSpy = vi.fn()

const mockIndicadorErrosSpy = vi.fn()

/**
 * O indicador usa `<Link>` do TanStack Router e exigiria um `RouterProvider`, que monta de forma
 * assíncrona e derrubaria as asserções síncronas de todo este arquivo. Aqui interessa só o que a
 * tabela PASSA para ele — o comportamento do link tem teste próprio, em
 * `IndicadorErrosDoCampo.test.tsx`, esse sim com router de verdade.
 */
vi.mock('./IndicadorErrosDoCampo', () => ({
  IndicadorErrosDoCampo: (props: {
    erros: { slug: string; codigo: string }[]
    nomeDoCampo: string
  }) => {
    mockIndicadorErrosSpy(props)
    return props.erros.length > 0 ? (
      <span data-testid={`indicador-erros-${props.nomeDoCampo}`}>{props.erros.length}</span>
    ) : null
  },
}))

// Mock isolado — a asserção central de M27 é que este componente NUNCA recebe
// props diferentes por causa do filtro. Capturar as props em cada render é a
// forma mais direta de provar isso (em vez de inferir pela ausência de
// mudança visual). `vi.mock` é hoisted pelo Vitest para antes dos imports.
vi.mock('../../../components/ui/SeloVerificacao', () => ({
  SeloVerificacao: (props: { data: Date; nota?: string }) => {
    mockSeloVerificacaoSpy(props)
    return <div data-testid="selo-verificacao">selo de verificação</div>
  },
}))

const camposPorGrupo: GrupoCampoVersao[] = [
  {
    grupo: 'Identificação',
    grupoSlug: 'identificacao',
    campos: [
      {
        campoLayoutSlug: 'razao-social',
        nome: 'Razão Social',
        caminhoXml: 'Prestador/RazaoSocial',
        significado: 'Nome da empresa prestadora',
        tipo: 'string',
        tamanho: '120',
        mascara: null,
        dominio: null,
        estadoPreenchimento: 'Obrigatorio',
        condicao: null,
        exemplo: 'Migrate LTDA',
        notaPreenchimento: null,
        destinoXml: 'Prestador/RazaoSocial',
        notaTransformacao: null,
        ordem: 1,
        errosConhecidos: [],
      },
      {
        campoLayoutSlug: 'inscricao-municipal',
        nome: 'Inscrição Municipal',
        caminhoXml: 'Prestador/InscricaoMunicipal',
        significado: 'Inscrição no cadastro municipal',
        tipo: 'string',
        tamanho: '15',
        mascara: null,
        dominio: null,
        estadoPreenchimento: 'Condicional',
        condicao: 'Obrigatório quando o município exige',
        exemplo: '123456',
        notaPreenchimento: null,
        destinoXml: 'Prestador/InscricaoMunicipal',
        notaTransformacao: null,
        ordem: 2,
        // Este campo tem rejeição registrada; o de cima não. A fixture precisa dos DOIS casos —
        // com os dois iguais, nenhuma asserção distinguiria "marca o campo certo" de "marca
        // todo campo".
        errosConhecidos: [{ slug: 'e-1023-inscricao-municipal', codigo: 'E-1023' }],
      },
    ],
  },
]

function renderizar() {
  return render(
    <TabelaCampos
      provedorNome="Prefeitura de Exemplo"
      versaoRotulo="Versão 1"
      verificadoEm="2026-07-01T00:00:00Z"
      totalCampos={2}
      camposPorGrupo={camposPorGrupo}
      urlVersaoAbsoluta="https://codex.migrate.info/provedores/prefeitura-exemplo/v1"
    />,
  )
}

describe('TabelaCampos', () => {
  beforeEach(() => {
    mockSeloVerificacaoSpy.mockClear()
  })

  it('mostra a frase de exaustividade completa quando não há filtro ativo', () => {
    renderizar()

    expect(
      screen.getByText(
        'Esta tabela é exaustiva: o que não está aqui não se aplica a Prefeitura de Exemplo Versão 1.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Filtro ativo')).not.toBeInTheDocument()
  })

  it('muda o texto de exaustividade quando o filtro está ativo (M27)', () => {
    renderizar()

    fireEvent.change(screen.getByPlaceholderText('Filtrar por nome do campo ou caminho no XML'), {
      target: { value: 'razão' },
    })

    expect(
      screen.getByText(
        'Mostrando 1 de 2 campos — a exaustividade vale para os 2 campos desta versão, não para este filtro.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Filtro ativo')).toBeInTheDocument()
    expect(screen.getByText('Razão Social')).toBeInTheDocument()
    expect(screen.queryByText('Inscrição Municipal')).not.toBeInTheDocument()
  })

  it('nunca re-renderiza o SeloVerificacao com props diferentes quando o filtro muda (M27)', () => {
    renderizar()

    expect(mockSeloVerificacaoSpy).toHaveBeenCalled()
    const propsAntesDoFiltro = mockSeloVerificacaoSpy.mock.calls.at(-1)?.[0]

    fireEvent.change(screen.getByPlaceholderText('Filtrar por nome do campo ou caminho no XML'), {
      target: { value: 'razão' },
    })

    const propsDepoisDoFiltro = mockSeloVerificacaoSpy.mock.calls.at(-1)?.[0]
    expect(propsDepoisDoFiltro).toEqual(propsAntesDoFiltro)

    fireEvent.change(screen.getByPlaceholderText('Filtrar por nome do campo ou caminho no XML'), {
      target: { value: '' },
    })

    const propsAposLimpar = mockSeloVerificacaoSpy.mock.calls.at(-1)?.[0]
    expect(propsAposLimpar).toEqual(propsAntesDoFiltro)
  })

  it('mostra o EmptyState com "Limpar filtros" quando nenhum campo bate o filtro', () => {
    renderizar()

    fireEvent.change(screen.getByPlaceholderText('Filtrar por nome do campo ou caminho no XML'), {
      target: { value: 'campo-que-nao-existe' },
    })

    expect(screen.getByText('Nenhum campo encontrado para esse filtro.')).toBeInTheDocument()

    // Dois botões "Limpar filtros" coexistem quando o filtro zera a lista
    // (um sempre alcançável perto do input, outro dentro do EmptyState) —
    // clicar em qualquer um dos dois tem o mesmo efeito.
    const [botaoLimpar] = screen.getAllByRole('button', { name: 'Limpar filtros' })
    fireEvent.click(botaoLimpar)

    expect(screen.getByText('Razão Social')).toBeInTheDocument()
    expect(screen.getByText('Inscrição Municipal')).toBeInTheDocument()
  })
})

/**
 * `caminhoXml` é o caminho no Layout InvoiCy — o que a coluna mostra. `destinoXml` é outra coisa:
 * para onde aquele campo vai no XML **daquele provedor**, e é nulo na maioria dos campos.
 *
 * O botão copiava o segundo. Quem clicava em "copiar caminho" levava string vazia e só descobria
 * ao colar. A fixture do arquivo não podia pegar isso porque dá o mesmo valor aos dois campos —
 * por isso este bloco tem fixture própria, com valores que se distinguem.
 */
describe('TabelaCampos — o botão copia o caminho que está na tela', () => {
  const CAMINHO_EXIBIDO = '//Prestador/RazaoSocial'
  const DESTINO_DO_PROVEDOR = '//OutroLugar/NoXmlDoProvedor'

  const grupoComCaminhosDistintos: GrupoCampoVersao[] = [
    {
      grupo: 'Identificação',
      grupoSlug: 'identificacao',
      campos: [
        {
          ...camposPorGrupo[0]!.campos[0]!,
          caminhoXml: CAMINHO_EXIBIDO,
          destinoXml: DESTINO_DO_PROVEDOR,
        },
      ],
    },
  ]

  function renderizarComCaminhosDistintos() {
    return render(
      <TabelaCampos
        provedorNome="Prefeitura de Exemplo"
        versaoRotulo="Versão 1"
        verificadoEm="2026-07-01T00:00:00Z"
        totalCampos={1}
        camposPorGrupo={grupoComCaminhosDistintos}
        urlVersaoAbsoluta="https://codex.migrate.info/provedores/prefeitura-exemplo/v1"
      />,
    )
  }

  it('copia o caminho do Layout InvoiCy, nunca o destino no XML do provedor', async () => {
    const escrito: string[] = []
    Object.assign(navigator, {
      clipboard: {
        writeText: (texto: string) => {
          escrito.push(texto)
          return Promise.resolve()
        },
      },
    })

    renderizarComCaminhosDistintos()

    const botao = screen.getAllByRole('button', { name: /^Copiar caminho no XML do campo/ })[0]!
    fireEvent.click(botao)

    await vi.waitFor(() => expect(escrito).toHaveLength(1))
    expect(escrito[0]).toBe(CAMINHO_EXIBIDO)
  })

  it('nunca copia vazio quando o campo não tem destino no XML do provedor', async () => {
    const escrito: string[] = []
    Object.assign(navigator, {
      clipboard: {
        writeText: (texto: string) => {
          escrito.push(texto)
          return Promise.resolve()
        },
      },
    })

    render(
      <TabelaCampos
        provedorNome="Prefeitura de Exemplo"
        versaoRotulo="Versão 1"
        verificadoEm="2026-07-01T00:00:00Z"
        totalCampos={1}
        camposPorGrupo={[
          {
            grupo: 'Identificação',
            grupoSlug: 'identificacao',
            campos: [
              { ...camposPorGrupo[0]!.campos[0]!, caminhoXml: CAMINHO_EXIBIDO, destinoXml: null },
            ],
          },
        ]}
        urlVersaoAbsoluta="https://codex.migrate.info/provedores/prefeitura-exemplo/v1"
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: /^Copiar caminho no XML do campo/ })[0]!)

    await vi.waitFor(() => expect(escrito).toHaveLength(1))
    expect(escrito[0]).toBe(CAMINHO_EXIBIDO)
  })
})

/**
 * Oito atributos do campo eram preenchidos na área interna e nunca chegavam ao leitor — entre eles
 * o **destino no XML do provedor**, que o artboard da tela pede, e a **condição**, que a etiqueta
 * "Condicional" promete na própria tabela sem nunca dizer qual é. Quem precisava deles abria um
 * chamado.
 *
 * A tabela não tem largura para oito colunas a mais, então o detalhe abre por linha.
 */
describe('TabelaCampos — detalhe do campo', () => {
  function abrir(nomeDoCampo: string) {
    // Nome exato: o aria-label dos botões de copiar também cita o campo ('Copiar caminho no XML
    // do campo X'), então uma regex casaria três botões na mesma linha.
    fireEvent.click(screen.getByRole('button', { name: nomeDoCampo }))
  }

  it('não mostra os atributos antes de abrir', () => {
    renderizar()

    expect(screen.queryByText('Obrigatório quando o município exige')).not.toBeInTheDocument()
  })

  it('mostra a condição que a etiqueta "Condicional" só anuncia', () => {
    renderizar()

    abrir('Inscrição Municipal')

    expect(screen.getByText('Condição')).toBeInTheDocument()
    expect(screen.getByText('Obrigatório quando o município exige')).toBeInTheDocument()
  })

  it('mostra o destino no XML do provedor', () => {
    renderizar()

    abrir('Razão Social')

    expect(screen.getByText('Destino no XML do provedor')).toBeInTheDocument()
  })

  it('anuncia o estado de abertura para o leitor de tela', () => {
    renderizar()

    const gatilho = screen.getByRole('button', { name: 'Inscrição Municipal' })
    expect(gatilho).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(gatilho)
    expect(gatilho).toHaveAttribute('aria-expanded', 'true')
  })

  it('fecha ao clicar de novo', () => {
    renderizar()

    abrir('Inscrição Municipal')
    expect(screen.getByText('Obrigatório quando o município exige')).toBeInTheDocument()

    abrir('Inscrição Municipal')
    expect(screen.queryByText('Obrigatório quando o município exige')).not.toBeInTheDocument()
  })

  /**
   * Comparar dois campos é o uso natural da tabela. Um acordeão que fecha o anterior obrigaria a
   * abrir e reabrir para isso.
   */
  it('mantém vários campos abertos ao mesmo tempo', () => {
    renderizar()

    abrir('Razão Social')
    abrir('Inscrição Municipal')

    expect(screen.getByText('Nome da empresa prestadora')).toBeInTheDocument()
    expect(screen.getByText('Inscrição no cadastro municipal')).toBeInTheDocument()
  })

  /** Linha sem nada a mostrar não pode oferecer um painel vazio. */
  it('não oferece abrir quando o campo não tem atributo nenhum preenchido', () => {
    render(
      <TabelaCampos
        provedorNome="Prefeitura de Exemplo"
        versaoRotulo="Versão 1"
        verificadoEm="2026-07-01T00:00:00Z"
        totalCampos={1}
        camposPorGrupo={[
          {
            grupo: 'Identificação',
            grupoSlug: 'identificacao',
            campos: [
              {
                ...camposPorGrupo[0]!.campos[0]!,
                significado: '',
                exemplo: null,
                destinoXml: null,
                condicao: null,
                mascara: null,
                dominio: null,
                notaPreenchimento: null,
                notaTransformacao: null,
              },
            ],
          },
        ]}
        urlVersaoAbsoluta="https://codex.migrate.info/provedores/prefeitura-exemplo/v1"
      />,
    )

    expect(screen.queryByRole('button', { name: 'Razão Social' })).not.toBeInTheDocument()
    expect(screen.getByText('Razão Social')).toBeInTheDocument()
  })

  describe('indicador de rejeição registrada no campo', () => {
    it('entrega ao indicador os erros do campo que tem rejeição', () => {
      renderizar()

      const props = mockIndicadorErrosSpy.mock.calls.map((chamada) => chamada[0])
      const doCampoComErro = props.find((p) => p.nomeDoCampo === 'Inscrição Municipal')

      expect(doCampoComErro.erros).toEqual([
        { slug: 'e-1023-inscricao-municipal', codigo: 'E-1023' },
      ])
    })

    /**
     * O par com o caso acima é o que prova que o dado segue o campo, em vez de ser repetido em
     * toda linha. Sozinho, qualquer um dos dois passaria com a ligação errada.
     */
    it('entrega lista vazia ao indicador do campo sem rejeição', () => {
      renderizar()

      const props = mockIndicadorErrosSpy.mock.calls.map((chamada) => chamada[0])
      const doCampoSemErro = props.find((p) => p.nomeDoCampo === 'Razão Social')

      expect(doCampoSemErro.erros).toEqual([])
    })
  })
})

/**
 * O link do aviso aponta para `#campo-{slug}`. A tabela é a dona da linha: rola até ela uma vez por
 * campo apontado e, se o filtro a escondeu, limpa o filtro antes — âncora sem alvo não leva a
 * lugar nenhum.
 */
describe('TabelaCampos — campo apontado por âncora', () => {
  const rolarParaOElemento = vi.fn()

  beforeEach(() => {
    Element.prototype.scrollIntoView = rolarParaOElemento
    rolarParaOElemento.mockClear()
  })

  function tabelaComDestaque(campoDestacado: string | null) {
    return (
      <TabelaCampos
        provedorNome="Prefeitura de Exemplo"
        versaoRotulo="Versão 1"
        verificadoEm="2026-07-01T00:00:00Z"
        totalCampos={2}
        camposPorGrupo={camposPorGrupo}
        urlVersaoAbsoluta="https://codex.migrate.info/provedores/prefeitura-exemplo/v1"
        campoDestacado={campoDestacado}
      />
    )
  }

  function digitarFiltro(texto: string) {
    fireEvent.change(screen.getByPlaceholderText('Filtrar por nome do campo ou caminho no XML'), {
      target: { value: texto },
    })
  }

  it('rola até a linha do campo apontado', () => {
    const { container } = render(tabelaComDestaque('inscricao-municipal'))

    expect(rolarParaOElemento).toHaveBeenCalledTimes(1)
    expect(rolarParaOElemento.mock.contexts[0]).toBe(
      container.querySelector('#campo-inscricao-municipal'),
    )
  })

  it('sem campo apontado, não rola', () => {
    render(tabelaComDestaque(null))

    expect(rolarParaOElemento).not.toHaveBeenCalled()
  })

  it('limpa o filtro que esconde o campo apontado e então rola até ele', () => {
    const { container, rerender } = render(tabelaComDestaque(null))
    digitarFiltro('inscri')
    expect(container.querySelector('#campo-razao-social')).toBeNull()

    rerender(tabelaComDestaque('razao-social'))

    expect(screen.getByPlaceholderText('Filtrar por nome do campo ou caminho no XML')).toHaveValue(
      '',
    )
    expect(container.querySelector('#campo-razao-social')).not.toBeNull()
    expect(rolarParaOElemento).toHaveBeenCalledTimes(1)
    expect(rolarParaOElemento.mock.contexts[0]).toBe(container.querySelector('#campo-razao-social'))
  })

  it('mantém o filtro que não esconde o campo apontado', () => {
    const { rerender } = render(tabelaComDestaque(null))
    digitarFiltro('inscri')

    rerender(tabelaComDestaque('inscricao-municipal'))

    expect(screen.getByPlaceholderText('Filtrar por nome do campo ou caminho no XML')).toHaveValue(
      'inscri',
    )
    expect(rolarParaOElemento).toHaveBeenCalledTimes(1)
  })

  it('digitar um filtro depois de chegar não rola de novo nem desfaz o filtro', () => {
    render(tabelaComDestaque('razao-social'))
    expect(rolarParaOElemento).toHaveBeenCalledTimes(1)

    digitarFiltro('inscri')

    expect(screen.getByPlaceholderText('Filtrar por nome do campo ou caminho no XML')).toHaveValue(
      'inscri',
    )
    expect(rolarParaOElemento).toHaveBeenCalledTimes(1)
  })
})
