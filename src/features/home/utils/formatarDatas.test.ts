import { describe, expect, it } from 'vitest'
import { formatarDataCurta, formatarDataHora } from './formatarDatas'

describe('formatarDataCurta', () => {
  it('mantém o dia do contrato — nunca desloca por fuso', () => {
    // `new Date('2026-08-14')` lê como UTC e devolve 13/08 em qualquer fuso a
    // oeste de Greenwich. Este caso é o que trava o uso de `parseISO`.
    expect(formatarDataCurta('2026-08-14')).toBe('14/08/2026')
  })

  it('formata o primeiro dia do ano sem virar o ano anterior', () => {
    expect(formatarDataCurta('2026-01-01')).toBe('01/01/2026')
  })
})

describe('formatarDataHora', () => {
  it('formata data e hora local no padrão brasileiro', () => {
    // Sem sufixo de fuso de propósito: o valor é lido como horário local, então
    // a asserção não depende do fuso da máquina que roda a suíte.
    expect(formatarDataHora('2026-08-19T09:00:00')).toBe('19/08/2026, 09:00')
  })
})
