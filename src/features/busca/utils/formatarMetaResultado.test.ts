import { describe, expect, it } from 'vitest'
import { formatarMetaResultado } from './formatarMetaResultado'

describe('formatarMetaResultado', () => {
  it('retorna null quando meta é null', () => {
    expect(formatarMetaResultado(null)).toBeNull()
  })

  it('formata meta de verificação em português, data curta', () => {
    expect(formatarMetaResultado({ tipo: 'verificacao', data: '2026-05-12' })).toBe(
      'Verificado em 12/05/2026',
    )
  })
})
