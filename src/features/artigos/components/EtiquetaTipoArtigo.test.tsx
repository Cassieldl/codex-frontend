import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { TipoArtigo } from '../types/artigo'
import { EtiquetaTipoArtigo } from './EtiquetaTipoArtigo'
import { ROTULO_TIPO_ARTIGO } from './rotulosTipoArtigo'

describe('EtiquetaTipoArtigo', () => {
  it('traduz o valor ASCII do contrato para o rótulo visível', () => {
    render(<EtiquetaTipoArtigo tipo="Mudanca" />)

    expect(screen.getByText('Mudança/Migração')).toBeInTheDocument()
    expect(screen.queryByText('Mudanca')).not.toBeInTheDocument()
  })

  it('cobre os três tipos do contrato com rótulos distintos entre si', () => {
    const tipos: TipoArtigo[] = ['Conceito', 'Procedimento', 'Mudanca']
    const rotulos = tipos.map((tipo) => ROTULO_TIPO_ARTIGO[tipo])

    expect(new Set(rotulos).size).toBe(3)

    for (const tipo of tipos) {
      const { unmount } = render(<EtiquetaTipoArtigo tipo={tipo} />)
      expect(screen.getByText(ROTULO_TIPO_ARTIGO[tipo])).toBeInTheDocument()
      unmount()
    }
  })

  it('o glifo é decorativo — o tipo é legível por texto, nunca só por ícone/cor', () => {
    const { container } = render(<EtiquetaTipoArtigo tipo="Conceito" />)

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Conceito')).toBeInTheDocument()
  })
})
