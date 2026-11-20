import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('mostra a mensagem padrão quando nenhuma é informada', () => {
    render(<ErrorState onRetry={() => {}} />)

    expect(screen.getByText('Não foi possível carregar esta informação agora.')).toBeInTheDocument()
  })

  it('mensagem customizada sobrescreve a padrão', () => {
    render(<ErrorState message="Muitas buscas em pouco tempo. Aguarde." onRetry={() => {}} />)

    expect(screen.getByText('Muitas buscas em pouco tempo. Aguarde.')).toBeInTheDocument()
  })

  it('chama onRetry ao clicar em "Tentar novamente"', async () => {
    const usuario = userEvent.setup()
    const aoTentarNovamente = vi.fn()

    render(<ErrorState onRetry={aoTentarNovamente} />)

    const botao = screen.getByRole('button', { name: 'Tentar novamente' })

    await usuario.click(botao)

    expect(aoTentarNovamente).toHaveBeenCalledTimes(1)
  })
})

describe('ErrorState — foco do botão de retry', () => {
  it('por padrão NÃO rouba o foco', () => {
    // O default mudou para `false` de propósito: em busca ao vivo o erro chega enquanto o usuário
    // digita, e o salto de foco engolia os caracteres seguintes; dentro de um modal, o foco
    // roubado ainda impedia o diálogo de devolver o foco ao gatilho ao fechar.
    render(<ErrorState onRetry={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Tentar novamente' })).not.toHaveFocus()
  })

  it('rouba o foco quando quem monta pede — tela inteira de erro', () => {
    render(<ErrorState onRetry={vi.fn()} autoFocusRetry />)

    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toHaveFocus()
  })
})
