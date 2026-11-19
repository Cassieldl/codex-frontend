import { describe, expect, it } from 'vitest'
import { secaoDoCaminho } from './secaoDoMenu'

describe('secaoDoCaminho', () => {
  it.each([
    ['/provedores/emissor-nacional/campos', 'provedores'],
    ['/artigos/webhook-de-nfs-e', 'artigos'],
    ['/layout/9', 'layout'],
    ['/layout', 'layout'],
  ])('%s pertence à seção %s', (caminho, secao) => {
    expect(secaoDoCaminho(caminho)).toBe(secao)
  })

  it('não marca seção pelo começo do nome nem fora do menu', () => {
    expect(secaoDoCaminho('/layouts-antigos')).toBeNull()
    expect(secaoDoCaminho('/erros/E0042')).toBeNull()
    expect(secaoDoCaminho('/')).toBeNull()
  })
})
