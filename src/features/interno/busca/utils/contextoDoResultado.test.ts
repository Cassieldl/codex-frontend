import { describe, expect, it } from 'vitest'
import { contextoDoResultado } from './contextoDoResultado'

describe('contextoDoResultado', () => {
  it('junta provedor e versão', () => {
    expect(
      contextoDoResultado({
        tipo: 'erro',
        provedorNome: 'GISS',
        versaoRotulo: '2.04',
        versoes: ['2.04'],
      }),
    ).toBe('GISS 2.04')
  })

  it('sem versão única, lista as versões em que o item vale', () => {
    expect(
      contextoDoResultado({
        tipo: 'erro',
        provedorNome: null,
        versaoRotulo: null,
        versoes: ['Elotech 2.03', 'GISS 2.04'],
      }),
    ).toBe('Elotech 2.03, GISS 2.04')
  })

  it('erro sem provedor nem versão é geral; outro tipo fica sem contexto', () => {
    const semContexto = { provedorNome: null, versaoRotulo: null, versoes: null }

    expect(contextoDoResultado({ tipo: 'erro', ...semContexto })).toBe('Geral')
    expect(contextoDoResultado({ tipo: 'artigo', ...semContexto })).toBeNull()
  })
})
