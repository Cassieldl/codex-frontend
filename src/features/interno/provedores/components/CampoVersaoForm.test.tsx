import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { OpcaoCampoLayout } from '../types/campoVersaoAdmin'
import { CampoVersaoForm } from './CampoVersaoForm'

const opcoes: OpcaoCampoLayout[] = [
  { id: 7, nome: 'Número da RPS', caminhoXml: '//Rps/Numero' },
  { id: 8, nome: 'Data de emissão', caminhoXml: '//Rps/DataEmissao' },
]

function renderForm(onSubmit = vi.fn()) {
  render(<CampoVersaoForm opcoesCampoLayout={opcoes} onSubmit={onSubmit} onCancel={vi.fn()} />)
  return { onSubmit }
}

async function preencherCamposObrigatorios(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole('combobox', { name: /campo canônico/i }))
  await usuario.click(screen.getByRole('option', { name: /Número da RPS/i }))
  await usuario.type(screen.getByLabelText(/tipo/i), 'Texto')
}

describe('CampoVersaoForm', () => {
  it('não exige condição quando o estado de preenchimento é Obrigatório (padrão)', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderForm()

    await preencherCamposObrigatorios(usuario)
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ campoLayoutId: 7, tipo: 'Texto' })
    expect(screen.queryByText(/a condição é obrigatória/i)).not.toBeInTheDocument()
  })

  it('exige condição quando o estado de preenchimento é Condicional', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderForm()

    await preencherCamposObrigatorios(usuario)

    await usuario.click(screen.getByRole('combobox', { name: /estado de preenchimento/i }))
    await usuario.click(screen.getByRole('option', { name: 'Condicional' }))

    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    expect(
      await screen.findByText(
        'A condição é obrigatória quando o estado de preenchimento é Condicional.',
      ),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await usuario.type(screen.getByLabelText(/condição/i), 'Só quando o cliente for MEI.')
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      estadoPreenchimento: 'Condicional',
      condicao: 'Só quando o cliente for MEI.',
    })
  })

  it('acusa erro em português quando o campo canônico não é selecionado', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderForm()

    await usuario.type(screen.getByLabelText(/tipo/i), 'Texto')
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Selecione o campo canônico.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
