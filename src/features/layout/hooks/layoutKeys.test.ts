import { describe, expect, it } from 'vitest'
import { layoutKeys } from './layoutKeys'

describe('layoutKeys', () => {
  it('cada endpoint tem um ramo próprio sob a mesma raiz', () => {
    expect(layoutKeys.indice()).toEqual(['layout', 'indice'])
    expect(layoutKeys.versao('4-13')).toEqual(['layout', 'versao', '4-13'])
    expect(layoutKeys.campo('numero-do-rps')).toEqual(['layout', 'campo', 'numero-do-rps'])
  })

  it('versões diferentes nunca compartilham entrada de cache', () => {
    expect(layoutKeys.versao('4-12')).not.toEqual(layoutKeys.versao('4-13'))
    expect(layoutKeys.campo('a')).not.toEqual(layoutKeys.campo('b'))
  })

  it('invalidar a raiz alcança os três ramos', () => {
    for (const chave of [layoutKeys.indice(), layoutKeys.versao('4-13'), layoutKeys.campo('x')]) {
      expect(chave[0]).toBe(layoutKeys.all[0])
    }
  })
})
