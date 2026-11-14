import { describe, expect, it } from 'vitest'
import { ordenarErrosPorCodigo } from './ordenarErrosPorCodigo'

describe('ordenarErrosPorCodigo', () => {
  it('ordena crescente comparando a parte numérica como número', () => {
    const erros = ['E10', 'E0953', 'E2', 'L1', 'E0477'].map((codigo) => ({ codigo }))

    expect(ordenarErrosPorCodigo(erros).map((erro) => erro.codigo)).toEqual([
      'E2',
      'E10',
      'E0477',
      'E0953',
      'L1',
    ])
  })

  it('não altera a lista recebida', () => {
    const erros = [{ codigo: 'E2' }, { codigo: 'E1' }]

    ordenarErrosPorCodigo(erros)

    expect(erros.map((erro) => erro.codigo)).toEqual(['E2', 'E1'])
  })
})
