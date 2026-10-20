import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TableRoot } from './Table'

describe('TableRoot: nome da região', () => {
  it('rotulo é obrigatório, então nenhuma tabela cai num nome genérico repetido', () => {
    // @ts-expect-error: sem rotulo o tsc reprova; se a prop voltar a ser opcional, esta linha quebra o typecheck
    const semRotulo = <TableRoot>{null}</TableRoot>

    expect(semRotulo.props).not.toHaveProperty('rotulo')
  })

  it('a região leva o rótulo recebido como nome acessível', () => {
    render(
      <TableRoot rotulo="Erros conhecidos">
        <tbody />
      </TableRoot>,
    )

    expect(screen.getByRole('region', { name: 'Erros conhecidos' })).toHaveAttribute(
      'tabindex',
      '0',
    )
  })
})
