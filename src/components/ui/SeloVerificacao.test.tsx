import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeloVerificacao } from './SeloVerificacao'

describe('SeloVerificacao', () => {
  it('formata a data em PT-BR por extenso', () => {
    // Mês 0-indexado: 7 = agosto.
    render(<SeloVerificacao data={new Date(2026, 7, 5)} />)

    expect(screen.getByText('05 de agosto de 2026')).toBeInTheDocument()
  })

  it('mostra a nota quando informada', () => {
    render(
      <SeloVerificacao data={new Date(2026, 7, 5)} nota="revisado após atualização do schema" />,
    )

    expect(screen.getByText(/revisado após atualização do schema/)).toBeInTheDocument()
  })

  it('não mostra nota quando ausente', () => {
    render(<SeloVerificacao data={new Date(2026, 7, 5)} />)

    expect(screen.queryByText(/·/)).not.toBeInTheDocument()
  })
})
