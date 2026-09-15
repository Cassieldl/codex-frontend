import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Modal } from './Modal'

function HospedeiroModal() {
  const [aberto, setAberto] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir modal
      </button>
      <Modal isOpen={aberto} onClose={() => setAberto(false)} title="Título do modal">
        <button type="button">Primeiro</button>
        <button type="button">Segundo</button>
      </Modal>
    </div>
  )
}

describe('Modal', () => {
  it('foca o primeiro campo do conteúdo ao abrir', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)

    await usuario.click(screen.getByRole('button', { name: 'Abrir modal' }))

    expect(await screen.findByRole('button', { name: 'Primeiro' })).toHaveFocus()
  })

  it('fecha com Esc', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)

    await usuario.click(screen.getByRole('button', { name: 'Abrir modal' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('devolve o foco ao elemento que abriu o modal', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)

    const botaoAbrir = screen.getByRole('button', { name: 'Abrir modal' })
    await usuario.click(botaoAbrir)
    await usuario.keyboard('{Escape}')

    expect(botaoAbrir).toHaveFocus()
  })

  it('prende o foco dentro do modal — Tab do último elemento volta ao primeiro', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)

    await usuario.click(screen.getByRole('button', { name: 'Abrir modal' }))

    const fechar = screen.getByRole('button', { name: 'Fechar' })
    const segundo = await screen.findByRole('button', { name: 'Segundo' })

    segundo.focus()
    await usuario.tab()

    expect(fechar).toHaveFocus()
  })

  it('prende o foco dentro do modal — Shift+Tab do primeiro elemento vai ao último', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)

    await usuario.click(screen.getByRole('button', { name: 'Abrir modal' }))

    const fechar = screen.getByRole('button', { name: 'Fechar' })
    const segundo = await screen.findByRole('button', { name: 'Segundo' })

    fechar.focus()
    await usuario.tab({ shift: true })

    expect(segundo).toHaveFocus()
  })

  it('não renderiza nada quando isOpen é false', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Oculto" />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('botão "Fechar" tem alvo de toque ampliado (≥44×44) via ::after — Achado #6', async () => {
    const usuario = userEvent.setup()
    render(<HospedeiroModal />)

    await usuario.click(screen.getByRole('button', { name: 'Abrir modal' }))

    const fechar = screen.getByRole('button', { name: 'Fechar' })
    expect(fechar.className).toMatch(/relative/)
    expect(fechar.className).toMatch(/after:h-11/)
    expect(fechar.className).toMatch(/after:w-11/)
  })
})
