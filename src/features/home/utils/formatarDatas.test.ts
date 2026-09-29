import { describe, expect, it } from 'vitest'
import { formatarDataHora } from './formatarDatas'

describe('formatarDataHora', () => {
  it('formata data e hora local no padrão brasileiro', () => {
    // Sem sufixo de fuso de propósito: o valor é lido como horário local, então
    // a asserção não depende do fuso da máquina que roda a suíte.
    expect(formatarDataHora('2026-08-19T09:00:00')).toBe('19/08/2026, 09:00')
  })
})
