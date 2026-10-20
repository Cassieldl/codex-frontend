import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { VersaoAdminDetalhe } from '../types/versaoAdmin'
import type { VersaoProvedorFormProps } from './VersaoProvedorForm'
import { VersaoProvedorForm } from './VersaoProvedorForm'

const VERSAO: VersaoAdminDetalhe = {
  id: 8,
  provedorId: 8,
  versaoLayoutId: 7,
  rotulo: '0.20',
  introducao: null,
  verificadoEm: null,
  publicado: false,
  avisos: [],
  versaoConcorrencia: 3,
}

function renderizarEdicao() {
  const onSubmit = vi.fn<VersaoProvedorFormProps['onSubmit']>()
  render(
    <VersaoProvedorForm
      initialData={VERSAO}
      opcoesVersaoLayout={[{ value: '7', label: '8' }]}
      permiteEscolherVersaoLayout={false}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  )
  return { onSubmit }
}

async function salvarComRotulo(rotulo: string) {
  const usuario = userEvent.setup()
  const campo = screen.getByRole('textbox', { name: /Rótulo/ })
  await usuario.clear(campo)
  await usuario.type(campo, rotulo)
  await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
}

describe('VersaoProvedorForm — rótulo', () => {
  // Literais, não a constante do schema: 80 é contrato com a coluna do banco e o validator do backend.
  it('aceita 80 caracteres', async () => {
    const { onSubmit } = renderizarEdicao()
    await salvarComRotulo('a'.repeat(80))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].rotulo).toHaveLength(80)
  })

  it('recusa 81 caracteres sem enviar', async () => {
    const { onSubmit } = renderizarEdicao()
    await salvarComRotulo('a'.repeat(81))

    expect(await screen.findByText('Máximo de 80 caracteres.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('VersaoProvedorForm — edição', () => {
  it('nunca envia versaoLayoutId: o PUT passaria a trocar o layout de verdade', async () => {
    const { onSubmit } = renderizarEdicao()
    await salvarComRotulo('0.21')

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].versaoLayoutId).toBeUndefined()
  })
})
