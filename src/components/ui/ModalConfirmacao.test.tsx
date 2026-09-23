import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ModalConfirmacao } from './ModalConfirmacao'

function renderizar(props?: Partial<Parameters<typeof ModalConfirmacao>[0]>) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()

  render(
    <ModalConfirmacao
      isOpen
      title="Remover exemplo"
      message='O exemplo "Nota simples" sai da página pública.'
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  )

  return { onConfirm, onCancel }
}

describe('ModalConfirmacao', () => {
  it('fechado não renderiza nada', () => {
    renderizar({ isOpen: false })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mostra o que será removido e só age no botão de confirmar', async () => {
    const usuario = userEvent.setup()
    const { onConfirm, onCancel } = renderizar()

    expect(screen.getByRole('dialog')).toHaveTextContent('O exemplo "Nota simples"')
    expect(onConfirm).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Remover' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('cancelar não confirma', async () => {
    const usuario = userEvent.setup()
    const { onConfirm, onCancel } = renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  /** A falha é o motivo de o diálogo existir: sem ela, o item some da tela sem explicação. */
  it('erro da ação é anunciado e o diálogo continua aberto', () => {
    renderizar({ erro: 'O exemplo foi alterado por outra pessoa.' })

    expect(screen.getByRole('alert')).toHaveTextContent('O exemplo foi alterado por outra pessoa.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('enquanto confirma, nenhum dos dois botões aceita um segundo clique', () => {
    renderizar({ isConfirming: true })

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Remover|Carregando/ })).toBeDisabled()
  })

  it('aceita rótulo próprio para o botão de confirmação', () => {
    renderizar({ confirmLabel: 'Excluir definitivamente' })

    expect(screen.getByRole('button', { name: 'Excluir definitivamente' })).toBeInTheDocument()
  })
})
