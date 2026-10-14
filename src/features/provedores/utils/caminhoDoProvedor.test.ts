import { describe, expect, it } from 'vitest'
import { caminhoDoProvedor } from './caminhoDoProvedor'

describe('caminhoDoProvedor', () => {
  it('sem versão, aponta para a página do provedor', () => {
    expect(caminhoDoProvedor('ipm')).toBe('/provedores/ipm')
  })

  it('com versão, aponta para a versão dentro do provedor', () => {
    expect(caminhoDoProvedor('ipm', '2-04')).toBe('/provedores/ipm/2-04')
  })

  it('versão vazia equivale a sem versão', () => {
    expect(caminhoDoProvedor('ipm', '')).toBe('/provedores/ipm')
  })
})
