import { describe, expect, it } from 'vitest'
import type { MarcosDaVersaoLayout } from '../types/layoutPublico'
import { formatarDataDoMarco, montarLinhaDoTempo } from './marcosDaVersao'

const MARCOS_DA_VERSAO_9 = {
  normaOrigem: 'NT 009 v1.01',
  homologacaoDesde: '2026-10-01',
  liberadaNoInvoicyEm: '2026-10-22',
  obrigatoriaEm: '2026-12-01',
}

function textos(hoje: Date, marcos: Partial<MarcosDaVersaoLayout> = MARCOS_DA_VERSAO_9) {
  const linha = montarLinhaDoTempo(marcos, hoje)
  return linha && { marcos: linha.marcos.map((marco) => marco.texto), hoje: linha.posicaoDeHoje }
}

describe('montarLinhaDoTempo', () => {
  it('homologação em mês e ano, os outros em dia, com hoje entre a liberação e a obrigatoriedade', () => {
    expect(textos(new Date(2026, 10, 14))).toEqual({
      marcos: ['out/2026', '22/10/2026', '01/12/2026'],
      hoje: 2,
    })
  })

  it('o dia do marco já conta como passado: hoje entra depois dele', () => {
    expect(textos(new Date(2026, 11, 1, 9, 30))?.hoje).toBe(3)
    expect(textos(new Date(2026, 8, 30))?.hoje).toBe(0)
  })

  it('marco sem data some sozinho e os outros ficam em ordem de data', () => {
    expect(
      textos(new Date(2026, 10, 14), {
        homologacaoDesde: null,
        liberadaNoInvoicyEm: '2026-12-20',
        obrigatoriaEm: '2026-12-01',
      }),
    ).toEqual({ marcos: ['01/12/2026', '20/12/2026'], hoje: 0 })
  })

  it('sem nenhuma data válida, não há linha do tempo', () => {
    expect(montarLinhaDoTempo({ normaOrigem: 'NT 009 v1.01' }, new Date())).toBeNull()
    expect(montarLinhaDoTempo({ obrigatoriaEm: 'amanhã' }, new Date())).toBeNull()
  })
})

describe('formatarDataDoMarco', () => {
  it('formata a data sem trocar de dia e devolve null sem data', () => {
    expect(formatarDataDoMarco('2026-12-01')).toBe('01/12/2026')
    expect(formatarDataDoMarco(null)).toBeNull()
    expect(formatarDataDoMarco(undefined)).toBeNull()
  })
})
