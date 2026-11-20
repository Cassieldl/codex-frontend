import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CampoLayoutForm } from './CampoLayoutForm'

type CampoDoFormulario = 'Nome' | 'Caminho no XML' | 'Grupo'

const VALORES_VALIDOS: Record<CampoDoFormulario, string> = {
  Nome: 'TomaCNPJ',
  'Caminho no XML': '//Tomador/TomaCNPJ',
  Grupo: 'Tomador',
}

/** Cria um campo com todos os valores válidos, exceto o informado. */
async function criarCom(campo: CampoDoFormulario, valor: string) {
  const onSubmit = vi.fn()
  render(<CampoLayoutForm modo="criar" onSubmit={onSubmit} onCancel={vi.fn()} />)

  const usuario = userEvent.setup()
  const valores = { ...VALORES_VALIDOS, [campo]: valor }
  for (const [rotulo, texto] of Object.entries(valores)) {
    await usuario.click(screen.getByRole('textbox', { name: new RegExp(rotulo) }))
    await usuario.paste(texto)
  }
  await usuario.click(screen.getByRole('textbox', { name: /Significado/ }))
  await usuario.paste('CNPJ do tomador.')
  await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

  return { onSubmit }
}

// Literais, não a constante do schema: são contrato com as colunas e o validator do backend.
describe.each([
  ['Nome', 120],
  ['Caminho no XML', 160],
  ['Grupo', 120],
] as const)('CampoLayoutForm: teto de %s', (campo, teto) => {
  it(`aceita ${teto} caracteres`, async () => {
    const valor = (campo === 'Caminho no XML' ? '//' : '').padEnd(teto, 'a')
    const { onSubmit } = await criarCom(campo, valor)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })

  it(`recusa ${teto + 1} caracteres sem enviar`, async () => {
    const valor = (campo === 'Caminho no XML' ? '//' : '').padEnd(teto + 1, 'a')
    const { onSubmit } = await criarCom(campo, valor)

    expect(await screen.findByText(`Máximo de ${teto} caracteres.`)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
