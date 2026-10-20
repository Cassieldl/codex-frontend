import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { ErroDoServidor } from './ErroDoServidor'

let rolagem: Mock<Element['scrollIntoView']>

beforeEach(() => {
  // O jsdom não implementa `scrollIntoView`.
  rolagem = vi.fn<Element['scrollIntoView']>()
  Element.prototype.scrollIntoView = rolagem
})

afterEach(() => {
  // O jsdom não tem o método: devolve o protótipo ao estado original.
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
})

describe('ErroDoServidor', () => {
  it('rola o alerta para a área visível quando a mensagem chega', () => {
    const { rerender } = render(<ErroDoServidor mensagem={null} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(rolagem).not.toHaveBeenCalled()

    rerender(<ErroDoServidor mensagem="Outra pessoa salvou este registro." />)

    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent('Outra pessoa salvou este registro.')
    expect(rolagem).toHaveBeenCalledWith({ block: 'nearest' })
    expect(rolagem.mock.contexts[0]).toBe(alerta)
  })
})
