import { describe, expect, it } from 'vitest'
import { alternarOrdenacao } from './ordenacaoDeTabela'

describe('alternarOrdenacao', () => {
  it('coluna nova começa crescente, mesmo vindo de outra coluna decrescente', () => {
    expect(alternarOrdenacao(null, 'titulo')).toEqual({ sortBy: 'titulo', sortDirection: 'asc' })
    expect(alternarOrdenacao({ sortBy: 'codigo', sortDirection: 'desc' }, 'titulo')).toEqual({
      sortBy: 'titulo',
      sortDirection: 'asc',
    })
  })

  it('a mesma coluna inverte a direção nos dois sentidos', () => {
    const decrescente = alternarOrdenacao({ sortBy: 'codigo', sortDirection: 'asc' }, 'codigo')
    expect(decrescente).toEqual({ sortBy: 'codigo', sortDirection: 'desc' })
    expect(alternarOrdenacao(decrescente, 'codigo')).toEqual({
      sortBy: 'codigo',
      sortDirection: 'asc',
    })
  })
})
