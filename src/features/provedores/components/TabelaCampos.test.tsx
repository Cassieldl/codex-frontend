import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GrupoCampoVersao } from '../types/versaoProvedorPagina'
import { TabelaCampos } from './TabelaCampos'

const mockSeloVerificacaoSpy = vi.fn()

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
