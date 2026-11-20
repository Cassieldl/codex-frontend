import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EstadoComunicado } from './EstadoComunicado'

describe('EstadoComunicado', () => {
  it('rascunho vigente é "Rascunho" - nunca "Encerrado"', () => {
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

  it('publicado e encerrado é "Encerrado" - o vencimento vence a publicação na leitura', () => {
    render(<EstadoComunicado publicado encerrado />)

    expect(screen.getByText('Encerrado')).toBeInTheDocument()
    expect(screen.queryByText('Publicado')).not.toBeInTheDocument()
  })

  it('rascunho encerrado é "Rascunho vencido" - a janela passou sem ele ir ao ar (D-2)', () => {
    render(<EstadoComunicado publicado={false} encerrado />)

    expect(screen.getByText('Rascunho vencido')).toBeInTheDocument()
    expect(screen.queryByText('Rascunho')).not.toBeInTheDocument()
    expect(screen.queryByText('Encerrado')).not.toBeInTheDocument()
    expect(screen.queryByText('Publicado')).not.toBeInTheDocument()
  })

  it('os quatro estados têm textos distintos entre si', () => {
    const combinacoes = [
      { publicado: false, encerrado: false },
      { publicado: true, encerrado: false },
      { publicado: true, encerrado: true },
      { publicado: false, encerrado: true },
    ]

    const textos = combinacoes.map(({ publicado, encerrado }) => {
      const { container, unmount } = render(
        <EstadoComunicado publicado={publicado} encerrado={encerrado} />,
      )
      const texto = container.textContent
      unmount()
      return texto
    })

    expect(textos).toEqual(['Rascunho', 'Publicado', 'Encerrado', 'Rascunho vencido'])
    expect(new Set(textos).size).toBe(4)
  })

  it('"Encerrado" e "Rascunho vencido" não se distinguem só pelo texto (WCAG 1.4.1)', () => {
    const { container: encerrado, unmount } = render(<EstadoComunicado publicado encerrado />)
    const classesEncerrado = encerrado.firstElementChild?.className ?? ''
    unmount()

    const { container: vencido } = render(<EstadoComunicado publicado={false} encerrado />)
    const classesVencido = vencido.firstElementChild?.className ?? ''

    expect(classesEncerrado).toContain('border-dashed')
    expect(classesVencido).toContain('border-dotted')
    expect(classesVencido).not.toContain('border-dashed')
  })
})
