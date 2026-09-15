import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { OpcaoCampoAfetado } from './AvisoForm'
import { AvisoForm } from './AvisoForm'

const opcoesCampos: OpcaoCampoAfetado[] = [{ id: 1, rotulo: 'Número da RPS' }]

describe('AvisoForm', () => {
  it('com escopo="provedor", não renderiza "campos afetados"', () => {
    render(
      <AvisoForm
        escopo="provedor"
        opcoesCamposAfetados={opcoesCampos}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByText('Campos afetados')).not.toBeInTheDocument()
    expect(
      screen.getByText('Este aviso vale para o provedor inteiro, em qualquer versão.'),
    ).toBeInTheDocument()
  })

  it('com escopo="versao", renderiza "campos afetados"', () => {
    render(
      <AvisoForm
        escopo="versao"
        opcoesCamposAfetados={opcoesCampos}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText('Campos afetados')).toBeInTheDocument()
    expect(screen.getByText('Número da RPS')).toBeInTheDocument()
  })

  it('escopo="provedor" nunca envia campoVersaoIds, mesmo que o estado interno os carregue', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn()
    render(<AvisoForm escopo="provedor" onSubmit={onSubmit} onCancel={vi.fn()} />)

    await usuario.type(screen.getByLabelText(/título/i), 'Instabilidade temporária')
    await usuario.type(screen.getByLabelText(/corpo/i), 'A prefeitura está fora do ar hoje.')
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ campoVersaoIds: [] })
  })

  it('escopo="versao" envia os ids marcados em campoVersaoIds', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <AvisoForm
        escopo="versao"
        opcoesCamposAfetados={opcoesCampos}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await usuario.type(screen.getByLabelText(/título/i), 'Campo obrigatório mudou')
    await usuario.type(screen.getByLabelText(/corpo/i), 'A partir desta versão, X é obrigatório.')
    await usuario.click(screen.getByLabelText('Número da RPS'))
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ campoVersaoIds: [1] })
  })
})
