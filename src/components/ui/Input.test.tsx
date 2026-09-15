import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('gera ids diferentes quando dois inputs não recebem id explícito (AP-FRONTEND-003)', () => {
    render(
      <>
        <Input label="Nome" />
        <Input label="E-mail" />
      </>,
    )

    const nome = screen.getByLabelText('Nome')
    const email = screen.getByLabelText('E-mail')

    expect(nome.id).not.toBe('')
    expect(email.id).not.toBe('')
    expect(nome.id).not.toBe(email.id)
  })

  it('associa o <label> ao input via htmlFor/id', () => {
    render(<Input label="Nome completo" />)

    const input = screen.getByLabelText('Nome completo')
    expect(input).toBeInTheDocument()
  })

  it('usa o id explícito quando fornecido', () => {
    render(<Input label="Nome" id="nome-do-provedor" />)

    expect(screen.getByLabelText('Nome')).toHaveAttribute('id', 'nome-do-provedor')
  })

  it('erro é comunicado por texto + ícone + aria-describedby, nunca só cor', () => {
    render(<Input label="E-mail" error="O e-mail é obrigatório." />)

    const input = screen.getByLabelText('E-mail')
    expect(input).toHaveAttribute('aria-invalid', 'true')

    const descritoPor = input.getAttribute('aria-describedby')
    expect(descritoPor).toBeTruthy()

    const mensagemErro = screen.getByText('O e-mail é obrigatório.')
    expect(mensagemErro.id).toBe(descritoPor)
  })

  it('mostra o hint quando não há erro', () => {
    render(<Input label="CNPJ" hint="Apenas números" />)

    expect(screen.getByText('Apenas números')).toBeInTheDocument()
  })
})
