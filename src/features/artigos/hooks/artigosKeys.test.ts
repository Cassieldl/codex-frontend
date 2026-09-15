import { describe, expect, it } from 'vitest'
import { artigosKeys } from './artigosKeys'

describe('artigosKeys', () => {
  it('inclui tipo, q e pagina na chave da listagem', () => {
    expect(artigosKeys.list({ tipo: 'Mudanca', q: 'nota', pagina: 3 })).toEqual([
      'artigos',
      'list',
      { tipo: 'Mudanca', q: 'nota', pagina: 3 },
    ])
  })

  it('separa cache por tipo — trocar de aba nunca reaproveita a lista anterior', () => {
    const conceito = artigosKeys.list({ tipo: 'Conceito', pagina: 1 })
    const procedimento = artigosKeys.list({ tipo: 'Procedimento', pagina: 1 })
    const todos = artigosKeys.list({ pagina: 1 })

    expect(conceito).not.toEqual(procedimento)
    expect(conceito).not.toEqual(todos)
    expect(procedimento).not.toEqual(todos)
  })

  it('detail é chaveado por slug e não colide com a listagem', () => {
    expect(artigosKeys.detail('como-funciona')).toEqual(['artigos', 'detail', 'como-funciona'])
    expect(artigosKeys.detail('como-funciona')).not.toEqual(artigosKeys.lists())
  })
})
