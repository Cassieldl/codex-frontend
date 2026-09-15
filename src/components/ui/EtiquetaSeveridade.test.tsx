import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EtiquetaSeveridade } from './EtiquetaSeveridade'

describe('EtiquetaSeveridade', () => {
  it('crítico: ícone + texto + par de cor testado em §3.2 (#8A0000 sobre #FFE0E0)', () => {
    render(<EtiquetaSeveridade severidade="critico" />)

    const etiqueta = screen.getByText('Crítico')
    expect(etiqueta.closest('span')?.querySelector('svg')).toBeInTheDocument()
    expect(etiqueta.className).toMatch(/text-severidade-critico-texto/)
    expect(etiqueta.className).toMatch(/bg-alert-error/)
  })

  it('alerta: ícone + texto + par de cor testado em §3.2 (#8A4B00 sobre #FFFBEF)', () => {
    render(<EtiquetaSeveridade severidade="alerta" />)

    const etiqueta = screen.getByText('Alerta')
    expect(etiqueta.closest('span')?.querySelector('svg')).toBeInTheDocument()
    expect(etiqueta.className).toMatch(/text-severidade-alerta-texto/)
    expect(etiqueta.className).toMatch(/bg-alert-warning/)
  })

  it('informativo: ícone + texto + par de cor testado em §3.2 (primary-medium sobre #DFF1FD)', () => {
    render(<EtiquetaSeveridade severidade="informativo" />)

    const etiqueta = screen.getByText('Informativo')
    expect(etiqueta.closest('span')?.querySelector('svg')).toBeInTheDocument()
    expect(etiqueta.className).toMatch(/text-primary-medium/)
    expect(etiqueta.className).toMatch(/bg-alert-info/)
  })

  it('mostra a contagem quando informada', () => {
    render(<EtiquetaSeveridade severidade="critico" contagem={3} />)

    expect(screen.getByText('(3)')).toBeInTheDocument()
  })

  it('não mostra contagem quando ausente', () => {
    render(<EtiquetaSeveridade severidade="critico" />)

    expect(screen.queryByText(/^\(\d+\)$/)).not.toBeInTheDocument()
  })
})
