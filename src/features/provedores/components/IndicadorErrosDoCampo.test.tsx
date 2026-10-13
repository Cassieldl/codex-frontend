import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IndicadorErrosDoCampo } from './IndicadorErrosDoCampo'

const ERROS = [
  { slug: 'e0248-cnpj-intermediario', codigo: 'E0248' },
  { slug: 'e0250-cpf-intermediario', codigo: 'E0250' },
  { slug: 'e0254-nif-intermediario', codigo: 'E0254' },
]

describe('IndicadorErrosDoCampo', () => {
  it('mostra quantas rejeições o campo tem, sem listar os códigos na linha', () => {
    render(<IndicadorErrosDoCampo erros={ERROS} nomeDoCampo="IntermCNPJ" onVerErros={() => {}} />)

    const botao = screen.getByRole('button')
    expect(botao).toHaveTextContent(/^3$/)
    expect(screen.queryByText('E0248')).not.toBeInTheDocument()
  })

  it('nomeia o campo e a quantidade no rótulo acessível', () => {
    render(<IndicadorErrosDoCampo erros={ERROS} nomeDoCampo="IntermCNPJ" onVerErros={() => {}} />)

    expect(
      screen.getByRole('button', { name: 'Ver as 3 rejeições registradas no campo IntermCNPJ' }),
    ).toBeInTheDocument()
  })

  it('concorda no singular quando há uma rejeição só', () => {
    render(
      <IndicadorErrosDoCampo
        erros={ERROS.slice(0, 1)}
        nomeDoCampo="IntermCNPJ"
        onVerErros={() => {}}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Ver a rejeição registrada no campo IntermCNPJ' }),
    ).toBeInTheDocument()
  })

  it('clicar pede o detalhe do campo', () => {
    const verErros = vi.fn()
    render(<IndicadorErrosDoCampo erros={ERROS} nomeDoCampo="IntermCNPJ" onVerErros={verErros} />)

    fireEvent.click(screen.getByRole('button'))

    expect(verErros).toHaveBeenCalledOnce()
  })

  it('não renderiza nada quando o campo não tem rejeição', () => {
    const { container } = render(
      <IndicadorErrosDoCampo erros={[]} nomeDoCampo="IntermCNPJ" onVerErros={() => {}} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
