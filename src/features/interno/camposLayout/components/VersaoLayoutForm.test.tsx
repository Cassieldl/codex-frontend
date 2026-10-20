import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { VersaoLayoutFormProps } from './VersaoLayoutForm'
import { VersaoLayoutForm } from './VersaoLayoutForm'

async function salvarComRotulo(rotulo: string) {
  const usuario = userEvent.setup()
  const onSubmit = vi.fn<VersaoLayoutFormProps['onSubmit']>()
  render(<VersaoLayoutForm modo="criar" onSubmit={onSubmit} onCancel={vi.fn()} />)

  await usuario.click(screen.getByRole('textbox', { name: /Rótulo/ }))
  await usuario.paste(rotulo)
  await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

  return { onSubmit }
}

// Literais, não a constante do schema: o teto é contrato com a coluna `rotulo varchar(80)`.
describe('VersaoLayoutForm: teto do rótulo', () => {
  it('aceita 80 caracteres', async () => {
    const { onSubmit } = await salvarComRotulo('8'.repeat(80))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].rotulo).toHaveLength(80)
  })

  it('recusa 81 caracteres sem enviar', async () => {
    const { onSubmit } = await salvarComRotulo('8'.repeat(81))

    expect(await screen.findByText('Máximo de 80 caracteres.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
