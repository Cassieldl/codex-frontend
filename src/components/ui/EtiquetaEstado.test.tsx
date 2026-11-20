import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EtiquetaEstado } from './EtiquetaEstado'

describe('EtiquetaEstado', () => {
  it('mostra o texto literal "Obrigatório" com borda sólida', () => {
    render(<EtiquetaEstado estado="obrigatorio" />)

    const etiqueta = screen.getByText('Obrigatório')
    expect(etiqueta).toBeInTheDocument()
    expect(etiqueta.className).toMatch(/border-solid/)
    expect(etiqueta.className).toMatch(/border-primary\b/)
  })

  it('mostra o texto literal "Condicional" com borda tracejada (M34 - risco de rejeição)', () => {
    render(<EtiquetaEstado estado="condicional" />)

    const etiqueta = screen.getByText('Condicional')
    expect(etiqueta).toBeInTheDocument()
    expect(etiqueta.className).toMatch(/border-dashed/)
  })

  it('mostra o texto literal "Opcional" com borda fina neutra (M34 - menor risco dos três)', () => {
    render(<EtiquetaEstado estado="opcional" />)

    const etiqueta = screen.getByText('Opcional')
    expect(etiqueta).toBeInTheDocument()
    expect(etiqueta.className).toMatch(/border-border/)
  })

  it('nunca usa cor de fundo como sinal - só forma de borda + texto', () => {
    const estados = ['obrigatorio', 'opcional', 'condicional'] as const

    for (const estado of estados) {
      const { unmount } = render(<EtiquetaEstado estado={estado} />)
      const etiqueta = screen.getByText(CONFIGURACAO_TEXTO[estado])

      expect(etiqueta.className).not.toMatch(/bg-(alert|success|error|accent)/)
      expect(etiqueta.className).toMatch(/bg-transparent/)

      unmount()
    }
  })
})

const CONFIGURACAO_TEXTO = {
  obrigatorio: 'Obrigatório',
  opcional: 'Opcional',
  condicional: 'Condicional',
} as const
