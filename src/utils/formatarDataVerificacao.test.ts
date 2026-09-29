import { describe, expect, it } from 'vitest'
import {
  formatarDataCurta,
  formatarDataVerificacao,
  rotuloVerificacao,
} from './formatarDataVerificacao'

/**
 * `new Date('2026-03-14')` é lido como meia-noite **UTC** e vira 13/03 em qualquer fuso a oeste de
 * Greenwich — o de todo usuário do Codex. A lista de provedores exibia exatamente isso: uma
 * verificação registrada em 14 aparecia como 13. Vale para os dois formatos.
 */
describe('data de verificação — o dia registrado nunca desloca', () => {
  it('por extenso', () => {
    expect(formatarDataVerificacao('2026-03-14')).toBe('14 de março de 2026')
  })

  it('numérica', () => {
    expect(formatarDataCurta('2026-03-14')).toBe('14/03/2026')
  })

  it('não vira o ano no primeiro dia', () => {
    expect(formatarDataCurta('2026-01-01')).toBe('01/01/2026')
    expect(formatarDataVerificacao('2026-01-01')).toBe('01 de janeiro de 2026')
  })

  it('aceita Date já construído, para quem não tem a string', () => {
    expect(formatarDataVerificacao(new Date(2026, 2, 14))).toBe('14 de março de 2026')
  })
})

/**
 * Os dois formatos existem porque os artboards os usam em papéis distintos: por extenso no selo
 * de verificação em destaque e em prosa; numérico na coluna de tabela, onde a forma compacta é o
 * que deixa as datas comparáveis de relance. Unificar os dois apaga essa distinção.
 */
describe('data de verificação — cada formato no seu papel', () => {
  it('o formato de destaque escreve o mês por extenso', () => {
    const formatada = formatarDataVerificacao('2026-09-24')

    expect(formatada).toBe('24 de setembro de 2026')
    expect(formatada).not.toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('o formato de tabela é numérico, nunca por extenso', () => {
    const formatada = formatarDataCurta('2026-09-24')

    expect(formatada).toBe('24/09/2026')
    expect(formatada).not.toContain('setembro')
  })
})

describe('rotuloVerificacao', () => {
  it('monta a frase de tabela inteira quando há verificação', () => {
    expect(rotuloVerificacao('2026-03-14')).toBe('Verificado em 14/03/2026')
  })

  /** O texto de ausência não é uma data e não pode receber o prefixo do chamador. */
  it('devolve o texto de ausência sozinho, sem prefixo', () => {
    expect(rotuloVerificacao(null)).toBe('Ainda não verificado')
  })
})
