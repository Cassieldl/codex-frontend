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
  it('mostra uma linha por código, na ordem recebida, como conversão do InvoiCy para o provedor', () => {
    render(<NaturezasOperacao naturezas={NATUREZAS} camposPorGrupo={[]} />)

    expect(screen.getByRole('heading', { name: 'Natureza da operação' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(2)

    const linhas = screen.getAllByRole('row').slice(1)
    expect(linhas.map((linha) => within(linha).getAllByRole('cell')[0].textContent)).toEqual([
      '7→ vira 1',
      '4→ vira 5',
      '16→ vira 14',
    ])
  })

  it('a observação vira nota embaixo da descrição, só na linha que tem', () => {
    render(<NaturezasOperacao naturezas={NATUREZAS} camposPorGrupo={[]} />)

    const linhas = screen.getAllByRole('row').slice(1)
    const notas = linhas.map((linha) => linha.querySelector('[data-nota-natureza]'))

    expect(notas[0]).toBeNull()
    expect(notas[1]).toHaveTextContent('Este provedor não recebe o tipo de imunidade.')
    expect(notas[2]).toHaveTextContent('A confirmar')
    expect(within(linhas[1]).getAllByRole('cell')[1]).toContainElement(notas[1] as HTMLElement)
  })

  it('não aparece quando a versão não tem tabela', () => {
    const { container } = render(<NaturezasOperacao naturezas={[]} camposPorGrupo={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
