import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { NaturezaOperacaoPublica } from '../types/versaoProvedorPagina'
import { NaturezasOperacao } from './NaturezasOperacao'

const NATUREZAS: NaturezaOperacaoPublica[] = [
  {
    codigoInvoicy: 7,
    descricao: 'Exigível',
    valorProvedor: '1',
    observacao: null,
    aConfirmar: false,
  },
  {
    codigoInvoicy: 4,
    descricao: 'Imunidade',
    valorProvedor: '5',
    observacao: 'Este provedor não recebe o tipo de imunidade.',
    aConfirmar: false,
  },
  {
    codigoInvoicy: 16,
    descricao: 'Não Tributada (NTRIB)',
    valorProvedor: '14',
    observacao: null,
    aConfirmar: true,
  },
]

/** Linhas com os códigos; a observação vem numa linha própria logo abaixo. */
function linhasDosCodigos(): HTMLElement[] {
  return screen.getAllByRole('row').filter((linha) => linha.querySelector('[data-codigo-invoicy]'))
}

describe('NaturezasOperacao', () => {
  it('mostra uma linha por código, na ordem recebida, com o que a pessoa envia e o que o provedor recebe', () => {
    render(<NaturezasOperacao naturezas={NATUREZAS} camposPorGrupo={[]} />)

    expect(screen.getByRole('heading', { name: 'Natureza da operação' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((coluna) => coluna.textContent)).toEqual([
      'Você envia',
      'Provedor recebe',
      'Significado',
    ])

    const linhas = linhasDosCodigos()
    expect(
      linhas.map((linha) =>
        within(linha)
          .getAllByRole('cell')
          .slice(0, 2)
          .map((celula) => celula.textContent),
      ),
    ).toEqual([
      ['7', '1'],
      ['4', '5'],
      ['16', '14'],
    ])
  })

  it('abre com a tag do provedor que recebe o natOp', () => {
    const camposPorGrupo = [
      {
        grupo: null,
        grupoSlug: null,
        campos: [
          {
            campoLayoutSlug: 'natureza-da-operacao',
            reformaTributaria: false,
            nome: 'natOp',
            caminhoXml: '//natOp',
            significado: '',
            tipo: 'Numérico',
            tamanho: null,
            mascara: null,
            dominio: null,
            estadoPreenchimento: 'Obrigatorio' as const,
            condicao: null,
            exemplo: null,
            notaPreenchimento: null,
            destinoXml: 'DPS/infDPS/valores/trib/tribMun/tribISSQN',
            notaTransformacao: null,
            ordem: 1,
            errosConhecidos: [],
          },
        ],
      },
    ]
    const { container } = render(
      <NaturezasOperacao naturezas={NATUREZAS} camposPorGrupo={camposPorGrupo} />,
    )

    expect(container.querySelector('[data-abertura-natureza]')).toHaveTextContent(
      'Você envia natOp InvoiCy converte Tabela unificada Provedor recebe tribISSQN (grupo tribMun)',
    )
  })

  it('a observação e a pendência viram alerta na largura toda, só na linha que tem', () => {
    render(<NaturezasOperacao naturezas={NATUREZAS} camposPorGrupo={[]} />)

    const linhas = linhasDosCodigos()
    const notas = linhas.map((linha) =>
      linha.closest('tbody')?.querySelector('[data-nota-natureza]'),
    )

    expect(notas[0]).toBeNull()
    // Cada alerta tem o rótulo escrito, sem depender do ícone nem da cor.
    expect(
      within(notas[1] as HTMLElement).getByRole('note', { name: 'Observação' }),
    ).toHaveTextContent('Este provedor não recebe o tipo de imunidade.')
    expect(
      within(notas[2] as HTMLElement).getByRole('note', { name: 'A confirmar' }),
    ).toHaveTextContent('Conversão ainda não confirmada na fonte do provedor.')
    expect((notas[1] as HTMLElement).closest('td')).toHaveAttribute('colspan', '3')
  })

  it('o código que chega igual a um anterior avisa qual, e só ele', () => {
    const comRepetido: NaturezaOperacaoPublica[] = [
      ...NATUREZAS,
      {
        codigoInvoicy: 9,
        descricao: 'Exportação de serviço',
        valorProvedor: '1',
        observacao: null,
        aConfirmar: false,
      },
    ]
    render(<NaturezasOperacao naturezas={comRepetido} camposPorGrupo={[]} />)

    const notas = linhasDosCodigos().map(
      (linha) => linha.querySelector('[data-equivalente]')?.textContent ?? null,
    )
    expect(notas).toEqual([null, null, null, 'Chega ao provedor igual ao código 7.'])
  })

  it('não aparece quando a versão não tem tabela', () => {
    const { container } = render(<NaturezasOperacao naturezas={[]} camposPorGrupo={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
