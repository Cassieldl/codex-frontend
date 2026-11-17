import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const VERSAO_9 = {
  id: 9,
  rotulo: '9',
  descricao: null,
  estado: 'Vigente' as const,
  ordem: 9,
  publicado: true,
  versaoConcorrencia: 1,
  normaOrigem: 'NT 009 v1.01',
  homologacaoDesde: '2026-10-01',
  liberadaNoInvoicyEm: '2026-10-22',
  obrigatoriaEm: '2026-12-01',
}

describe('VersaoLayoutForm: origem e marcos', () => {
  it('na criação, envia a norma e as datas preenchidas e omite as vazias', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn<VersaoLayoutFormProps['onSubmit']>()
    render(<VersaoLayoutForm modo="criar" onSubmit={onSubmit} onCancel={vi.fn()} />)

    await usuario.type(screen.getByRole('textbox', { name: /Rótulo/ }), '9')
    await usuario.type(screen.getByRole('textbox', { name: /Norma de origem/ }), 'NT 009 v1.01')
    fireEvent.change(screen.getByLabelText('Obrigatória em'), { target: { value: '2026-12-01' } })
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const enviado = onSubmit.mock.calls[0][0]
    expect(enviado).toMatchObject({ normaOrigem: 'NT 009 v1.01', obrigatoriaEm: '2026-12-01' })
    expect(enviado).not.toHaveProperty('homologacaoDesde')
    expect(enviado).not.toHaveProperty('liberadaNoInvoicyEm')
  })

  it('recusa norma com mais de 60 caracteres sem enviar', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn<VersaoLayoutFormProps['onSubmit']>()
    render(<VersaoLayoutForm modo="criar" onSubmit={onSubmit} onCancel={vi.fn()} />)

    await usuario.type(screen.getByRole('textbox', { name: /Rótulo/ }), '9')
    await usuario.click(screen.getByRole('textbox', { name: /Norma de origem/ }))
    await usuario.paste('N'.repeat(61))
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Máximo de 60 caracteres.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('na edição, abre com os marcos da versão e manda os quatro, com null na norma e na data apagadas', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn<VersaoLayoutFormProps['onSubmit']>()
    render(
      <VersaoLayoutForm
        modo="editar"
        initialData={VERSAO_9}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('textbox', { name: /Norma de origem/ })).toHaveValue('NT 009 v1.01')
    expect(screen.getByLabelText('Liberada no InvoiCy em')).toHaveValue('2026-10-22')

    fireEvent.change(screen.getByLabelText('Homologação desde'), { target: { value: '' } })
    await usuario.clear(screen.getByRole('textbox', { name: /Norma de origem/ }))
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      normaOrigem: null,
      homologacaoDesde: null,
      liberadaNoInvoicyEm: '2026-10-22',
      obrigatoriaEm: '2026-12-01',
    })
  })

  it('na edição, marco que já estava vazio também vai, como null', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn<VersaoLayoutFormProps['onSubmit']>()
    render(
      <VersaoLayoutForm
        modo="editar"
        initialData={{ ...VERSAO_9, obrigatoriaEm: null }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toHaveProperty('obrigatoriaEm', null)
  })
})
