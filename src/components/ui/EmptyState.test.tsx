import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('mostra a mensagem padrão quando nenhuma é informada', () => {
    render(<EmptyState />)

    expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument()
  })

  it('mensagem customizada sobrescreve a padrão', () => {
    render(<EmptyState message="A busca não encontrou este termo." />)

    expect(screen.getByText('A busca não encontrou este termo.')).toBeInTheDocument()
    expect(screen.queryByText('Nenhum item encontrado.')).not.toBeInTheDocument()
  })

  it('renderiza a ação como botão real e focável, e chama o handler ao clicar', async () => {
    const usuario = userEvent.setup()
    const aoClicar = vi.fn()

    render(<EmptyState action={<Button onClick={aoClicar}>Ver todos os provedores</Button>} />)

    const acao = screen.getByRole('button', { name: 'Ver todos os provedores' })
    await usuario.click(acao)

    expect(aoClicar).toHaveBeenCalledTimes(1)
  })
})
