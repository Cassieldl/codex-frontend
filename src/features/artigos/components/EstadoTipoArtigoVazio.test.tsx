import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EstadoTipoArtigoVazio } from './EstadoTipoArtigoVazio'

describe('EstadoTipoArtigoVazio', () => {
  it('variante sem-acervo nomeia o tipo e aponta os outros tipos', () => {
    render(<EstadoTipoArtigoVazio variante="sem-acervo" tipo="Procedimento" />)

    expect(screen.getByText('Nenhum artigo de Procedimento publicado.')).toBeInTheDocument()
    expect(screen.getByText('Veja os artigos dos outros tipos na aba Todos.')).toBeInTheDocument()
    expect(screen.queryByText(/corresponde à sua busca/)).not.toBeInTheDocument()
  })

  it('variante sem-resultado fala de busca, nunca de acervo vazio', () => {
    render(<EstadoTipoArtigoVazio variante="sem-resultado" tipo="Conceito" />)

    expect(
      screen.getByText('Nenhum artigo de Conceito corresponde à sua busca.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Tente outro termo ou busque em todos os tipos.')).toBeInTheDocument()
    expect(screen.queryByText(/publicado[.]$/)).not.toBeInTheDocument()
  })

  it('usa o rótulo com acento de Mudança, não o valor ASCII do contrato', () => {
    render(<EstadoTipoArtigoVazio variante="sem-acervo" tipo="Mudanca" />)

    expect(screen.getByText('Nenhum artigo de Mudança/Migração publicado.')).toBeInTheDocument()
  })
})
