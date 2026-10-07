import { describe, expect, it } from 'vitest'
import { construirIdAviso, construirLinkAviso, extrairIdDoAvisoNoHash } from './avisoAncora'

describe('construirIdAviso', () => {
  it('prefixa o id com "aviso-"', () => {
    expect(construirIdAviso(12)).toBe('aviso-12')
  })
})

describe('extrairIdDoAvisoNoHash', () => {
  it('lê o id numérico do hash', () => {
    expect(extrairIdDoAvisoNoHash('#aviso-12')).toBe(12)
  })

  it('devolve nulo para hash de outra âncora', () => {
    expect(extrairIdDoAvisoNoHash('#campo-razao-social')).toBeNull()
    expect(extrairIdDoAvisoNoHash('#exemplo-12')).toBeNull()
    expect(extrairIdDoAvisoNoHash('')).toBeNull()
  })

  it('devolve nulo quando o sufixo não é um id numérico', () => {
    expect(extrairIdDoAvisoNoHash('#aviso-')).toBeNull()
    expect(extrairIdDoAvisoNoHash('#aviso-abc')).toBeNull()
    expect(extrairIdDoAvisoNoHash('#aviso-12abc')).toBeNull()
  })
})

describe('construirLinkAviso', () => {
  it('une origem, caminho da página e âncora', () => {
    expect(
      construirLinkAviso('https://codex.migrate.info', '/provedores/prefeitura-exemplo/v1', 12),
    ).toBe('https://codex.migrate.info/provedores/prefeitura-exemplo/v1#aviso-12')
  })
})
