import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BlocoAutocorrecao } from './BlocoAutocorrecao'

describe('BlocoAutocorrecao', () => {
  it('mostra os dois termos quando há correção', () => {
    render(<BlocoAutocorrecao correcao={{ termoOriginal: 'invoicy', termoCorrigido: 'InvoiCy' }} />)

    expect(screen.getByText('invoicy')).toBeInTheDocument()
    expect(screen.getByText('InvoiCy')).toBeInTheDocument()
  })

  it('não renderiza nada quando não há correção', () => {
    const { container } = render(<BlocoAutocorrecao correcao={null} />)

    expect(container).toBeEmptyDOMElement()
  })
})
