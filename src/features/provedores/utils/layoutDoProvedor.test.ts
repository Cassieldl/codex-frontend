import { describe, expect, it } from 'vitest'
import { vigenteAFrenteDoProvedor } from './layoutDoProvedor'

const VERSAO_8 = { slug: '8', rotulo: '8', ordem: 4 }
const VIGENTE_9 = { slug: '9', rotulo: '9', ordem: 5, obrigatoriaEm: '2026-12-01' }
const PREVISTA_10 = { slug: '10', rotulo: '10', ordem: 6 }

const INDICE = { vigente: VIGENTE_9, versoes: [PREVISTA_10, VIGENTE_9, VERSAO_8] }

describe('vigenteAFrenteDoProvedor', () => {
  it('devolve a vigente quando o mapeamento segue uma versão anterior', () => {
    expect(vigenteAFrenteDoProvedor('8', INDICE)).toEqual({
      slug: '9',
      rotulo: '9',
      obrigatoriaEm: '2026-12-01',
    })
  })

  // O cadastro pode trazer "Versão 9" de um lado e "9" do outro: é a mesma versão.
  it('nada a avisar quando o mapeamento já segue a vigente, com ou sem a palavra "versão"', () => {
    expect(vigenteAFrenteDoProvedor('Versão 9', INDICE)).toBeNull()
  })

  it('nada a avisar quando o mapeamento segue uma versão mais nova que a vigente', () => {
    expect(vigenteAFrenteDoProvedor('10', INDICE)).toBeNull()
  })

  it('nada a avisar sem vigente conhecida', () => {
    expect(vigenteAFrenteDoProvedor('8', { vigente: null, versoes: [] })).toBeNull()
    expect(vigenteAFrenteDoProvedor('8', undefined)).toBeNull()
  })
})
