import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EstadoComunicado } from './EstadoComunicado'

describe('EstadoComunicado', () => {
  it('rascunho vigente é "Rascunho" — nunca "Encerrado"', () => {
    render(<EstadoComunicado publicado={false} encerrado={false} />)

    expect(screen.getByText('Rascunho')).toBeInTheDocument()
    expect(screen.queryByText('Encerrado')).not.toBeInTheDocument()
    expect(screen.queryByText('Publicado')).not.toBeInTheDocument()
  })

  it('publicado e vigente é "Publicado"', () => {
    render(<EstadoComunicado publicado encerrado={false} />)

    expect(screen.getByText('Publicado')).toBeInTheDocument()
    expect(screen.queryByText('Encerrado')).not.toBeInTheDocument()
    expect(screen.queryByText('Rascunho')).not.toBeInTheDocument()
  })

  it('publicado e encerrado é "Encerrado" — o vencimento vence a publicação na leitura', () => {
    render(<EstadoComunicado publicado encerrado />)

    expect(screen.getByText('Encerrado')).toBeInTheDocument()
    expect(screen.queryByText('Publicado')).not.toBeInTheDocument()
  })

  it('rascunho encerrado continua "Rascunho" — nunca foi ao ar para poder encerrar', () => {
    render(<EstadoComunicado publicado={false} encerrado />)

    expect(screen.getByText('Rascunho')).toBeInTheDocument()
    expect(screen.queryByText('Encerrado')).not.toBeInTheDocument()
  })
})
