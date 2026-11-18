import { describe, expect, it } from 'vitest'
import { diasAteObrigatoria, rotuloDiasRestantes } from './diasAteObrigatoria'

const HOJE = new Date(2026, 10, 17, 23, 30)

describe('diasAteObrigatoria', () => {
  it('conta dias de calendário, não horas: 23h30 do dia 17 ainda faltam 14 dias para o dia 1º', () => {
    expect(diasAteObrigatoria('2026-12-01', HOJE)).toBe(14)
  })

  it('some no dia do prazo e depois dele', () => {
    expect(diasAteObrigatoria('2026-11-17', HOJE)).toBeNull()
    expect(diasAteObrigatoria('2026-11-10', HOJE)).toBeNull()
  })

  it('some sem data ou com data inválida', () => {
    expect(diasAteObrigatoria(null, HOJE)).toBeNull()
    expect(diasAteObrigatoria('não é data', HOJE)).toBeNull()
  })
})

describe('rotuloDiasRestantes', () => {
  it('usa singular só para um dia', () => {
    expect(rotuloDiasRestantes(1)).toBe('Falta 1 dia')
    expect(rotuloDiasRestantes(14)).toBe('Faltam 14 dias')
  })
})
