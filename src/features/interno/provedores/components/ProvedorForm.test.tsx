import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ProvedorFormProps } from './ProvedorForm'
import { ProvedorForm } from './ProvedorForm'
import { separarAliases } from './separarAliases'

// Os tetos são contrato com o validator do backend e com as colunas: os testes escrevem o literal.

function renderizar() {
  const onSubmit = vi.fn<ProvedorFormProps['onSubmit']>()
  render(<ProvedorForm onSubmit={onSubmit} onCancel={vi.fn()} />)
  return { onSubmit }
}

interface Preenchimento {
  nome?: string
  identificador?: string
  aliases?: string
}

async function preencherESalvar({
  nome = 'Emissor Nacional',
  identificador = 'EMISSOR_NACIONAL',
  aliases = '',
}: Preenchimento) {
  const usuario = userEvent.setup()
  // `paste` em vez de `type`: centenas de teclas por campo deixariam o teste lento sem testar nada a mais.
  await usuario.click(screen.getByRole('textbox', { name: /Nome/ }))
  await usuario.paste(nome)
  await usuario.click(screen.getByRole('textbox', { name: /Identificador InvoiCy/ }))
  await usuario.paste(identificador)
  if (aliases) {
    await usuario.click(screen.getByRole('textbox', { name: /Aliases/ }))
    await usuario.paste(aliases)
  }
  await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
}

describe('ProvedorForm — tetos', () => {
  it('aceita nome de 160, identificador de 80 e alias de 160 caracteres', async () => {
    const { onSubmit } = renderizar()
    await preencherESalvar({
      nome: 'n'.repeat(160),
      identificador: 'i'.repeat(80),
      aliases: 'a'.repeat(160),
    })

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const dto = onSubmit.mock.calls[0][0]
    expect(dto.nome).toHaveLength(160)
    expect(dto.identificadorInvoicy).toHaveLength(80)
    expect(dto.aliases).toEqual(['a'.repeat(160)])
  })

  it('recusa nome de 161 caracteres', async () => {
    const { onSubmit } = renderizar()
    await preencherESalvar({ nome: 'n'.repeat(161) })

    expect(await screen.findByText('Máximo de 160 caracteres.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('recusa identificador de 81 caracteres', async () => {
    const { onSubmit } = renderizar()
    await preencherESalvar({ identificador: 'i'.repeat(81) })

    expect(await screen.findByText('Máximo de 80 caracteres.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('recusa alias de 161 caracteres', async () => {
    const { onSubmit } = renderizar()
    await preencherESalvar({ aliases: `ADN\n${'a'.repeat(161)}` })

    expect(await screen.findByText('Cada alias tem no máximo 160 caracteres.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('ProvedorForm — aliases repetidos', () => {
  it('recusa o mesmo alias duas vezes, inclusive com espaço nas pontas', async () => {
    const { onSubmit } = renderizar()
    await preencherESalvar({ aliases: 'ADN\nSefin Nacional\n  ADN  ' })

    expect(await screen.findByText('O alias "ADN" aparece mais de uma vez.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('aceita aliases que só diferem por maiúscula, como o banco aceita', async () => {
    const { onSubmit } = renderizar()
    await preencherESalvar({ aliases: 'ADN\nadn' })

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].aliases).toEqual(['ADN', 'adn'])
  })
})

describe('separarAliases', () => {
  it('um alias por linha, sem espaço nas pontas e sem linha vazia', () => {
    expect(separarAliases('  ADN \n\nSefin Nacional\n   \n')).toEqual(['ADN', 'Sefin Nacional'])
    expect(separarAliases(undefined)).toEqual([])
  })
})
