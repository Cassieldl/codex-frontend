import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EtiquetaPublicacao } from './EtiquetaPublicacao'

describe('EtiquetaPublicacao', () => {
  it('publicadoProprio=true e publicadoEfetivo=true → "Publicado"', () => {
    render(<EtiquetaPublicacao publicadoProprio publicadoEfetivo />)

    expect(screen.getByText('Publicado')).toBeInTheDocument()
  })

  it('publicadoProprio=false → "Rascunho", independente de publicadoEfetivo', () => {
    const { unmount } = render(<EtiquetaPublicacao publicadoProprio={false} publicadoEfetivo />)
    expect(screen.getByText('Rascunho')).toBeInTheDocument()
    unmount()

    render(<EtiquetaPublicacao publicadoProprio={false} publicadoEfetivo={false} />)
    expect(screen.getByText('Rascunho')).toBeInTheDocument()
  })

  it('publicadoProprio=true e publicadoEfetivo=false → "Publicado, oculto" com o motivoOculto no texto', () => {
    render(
      <EtiquetaPublicacao
        publicadoProprio
        publicadoEfetivo={false}
        motivoOculto="o provedor Prefeitura de Exemplo"
      />,
    )

    expect(
      screen.getByText(
        'Publicado · oculto porque o provedor Prefeitura de Exemplo está em rascunho',
      ),
    ).toBeInTheDocument()
  })

  it('nenhum dos três estados depende só de cor — cada um tem texto acessível distinto', () => {
    const { unmount: unmountPublicado } = render(
      <EtiquetaPublicacao publicadoProprio publicadoEfetivo />,
    )
    expect(screen.getByText('Publicado')).toBeInTheDocument()
    unmountPublicado()

    const { unmount: unmountRascunho } = render(
      <EtiquetaPublicacao publicadoProprio={false} publicadoEfetivo={false} />,
    )
    expect(screen.getByText('Rascunho')).toBeInTheDocument()
    unmountRascunho()

    render(<EtiquetaPublicacao publicadoProprio publicadoEfetivo={false} motivoOculto="X" />)
    expect(screen.getByText(/Publicado · oculto porque X está em rascunho/)).toBeInTheDocument()
  })
})
