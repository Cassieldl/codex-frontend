import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EstadoTipoArtigoVazio } from './EstadoTipoArtigoVazio'

describe('EstadoTipoArtigoVazio', () => {
  it('variante sem-acervo nomeia o tipo e explica como o acervo cresce', () => {
    render(<EstadoTipoArtigoVazio variante="sem-acervo" tipo="Procedimento" />)

    expect(screen.getByText('Ainda não há artigo de Procedimento publicado.')).toBeInTheDocument()
    expect(screen.getByText(/O acervo cresce a partir dos chamados/)).toBeInTheDocument()
    expect(screen.queryByText(/corresponde à sua busca/)).not.toBeInTheDocument()
  })

  it('variante sem-resultado fala de busca, nunca de acervo vazio', () => {
    render(<EstadoTipoArtigoVazio variante="sem-resultado" tipo="Conceito" />)

    expect(
      screen.getByText('Nenhum artigo de Conceito corresponde à sua busca.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('O tipo continua aqui para você saber que ele existe.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Ainda não há artigo/)).not.toBeInTheDocument()
  })

  it('usa o rótulo com acento de Mudança, não o valor ASCII do contrato', () => {
    render(<EstadoTipoArtigoVazio variante="sem-acervo" tipo="Mudanca" />)

    expect(
      screen.getByText('Ainda não há artigo de Mudança/Migração publicado.'),
    ).toBeInTheDocument()
  })
})
