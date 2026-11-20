import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Toast } from './Toast'

describe('Toast', () => {
  it('renderiza a mensagem com role="alert" para tons de erro/aviso', () => {
    render(<Toast tone="error" message="Falha ao salvar." />)

    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao salvar.')
  })

  it('renderiza a mensagem com role="status" para tons de sucesso/info', () => {
    render(<Toast tone="success" message="Salvo com sucesso." />)

    expect(screen.getByRole('status')).toHaveTextContent('Salvo com sucesso.')
  })

  it('sem onClose, não renderiza botão de fechar', () => {
    render(<Toast tone="info" message="Aviso informativo." />)

    expect(screen.queryByRole('button', { name: 'Fechar aviso' })).not.toBeInTheDocument()
  })

  it('com onClose, clicar em "Fechar aviso" chama o callback', async () => {
    const usuario = userEvent.setup()
    const aoFechar = vi.fn()
    render(<Toast tone="warning" message="Atenção." onClose={aoFechar} />)

    await usuario.click(screen.getByRole('button', { name: 'Fechar aviso' }))

    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('botão "Fechar aviso" tem alvo de toque ampliado (≥44×44) via ::after - Achado #6', () => {
    render(<Toast tone="error" message="Falha ao salvar." onClose={() => {}} />)

    const fechar = screen.getByRole('button', { name: 'Fechar aviso' })
    expect(fechar.className).toMatch(/relative/)
    expect(fechar.className).toMatch(/after:h-11/)
    expect(fechar.className).toMatch(/after:w-11/)
  })
})
