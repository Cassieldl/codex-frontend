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

describe('NaturezasOperacao', () => {
  it('mostra uma linha por código, na ordem recebida, com o valor no layout do provedor', () => {
    render(<NaturezasOperacao naturezas={NATUREZAS} camposPorGrupo={[]} />)

    expect(screen.getByRole('heading', { name: 'Natureza da operação' })).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Valor no layout do provedor' }),
    ).toBeInTheDocument()

    const linhas = screen.getAllByRole('row').slice(1)
    expect(linhas.map((linha) => within(linha).getAllByRole('cell')[0].textContent)).toEqual([
      '7',
      '4',
      '16',
    ])
    expect(
      within(linhas[1]).getByText('Este provedor não recebe o tipo de imunidade.'),
    ).toBeInTheDocument()
    expect(within(linhas[2]).getByText('A confirmar')).toBeInTheDocument()
    expect(within(linhas[0]).queryByText('A confirmar')).toBeNull()
  })

  it('não aparece quando a versão não tem tabela', () => {
    const { container } = render(<NaturezasOperacao naturezas={[]} camposPorGrupo={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
