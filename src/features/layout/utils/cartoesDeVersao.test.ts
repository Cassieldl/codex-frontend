import { describe, expect, it } from 'vitest'
import type { LayoutIndice, LayoutVersaoResumo } from '../types/layoutPublico'
import { montarCartoesDeVersao } from './cartoesDeVersao'

function versao(
  slug: string,
  estado: LayoutVersaoResumo['estado'],
  totalCampos: number,
  obrigatoriaEm: string | null = null,
): LayoutVersaoResumo {
  return {
    slug,
    rotulo: slug,
    estado,
    ordem: Number(slug),
    totalCampos,
    mudancas: [],
    normaOrigem: null,
    homologacaoDesde: null,
    liberadaNoInvoicyEm: null,
    obrigatoriaEm,
  }
}

const PREVISTA = versao('10', 'Prevista', 600, '2027-06-01')
const VIGENTE = versao('9', 'Vigente', 591, '2026-12-01')
const ANTERIOR = versao('8', 'Anterior', 547, '2025-01-01')

function indice(parcial: Partial<LayoutIndice> = {}): LayoutIndice {
  return {
    vigente: VIGENTE,
    versoes: [PREVISTA, VIGENTE, ANTERIOR],
    novidades: {
      versao: VIGENTE,
      anterior: ANTERIOR,
      descricao: null,
      camposNovos: 44,
      camposDescontinuados: 20,
    },
    ...parcial,
  }
}

describe('montarCartoesDeVersao', () => {
  it('põe a vigente na frente e só ela fala de novos e de obrigatoriedade', () => {
    const cartoes = montarCartoesDeVersao(indice())

    expect(cartoes.map((cartao) => [cartao.versao.slug, cartao.ehVigente, cartao.fatos])).toEqual([
      ['9', true, ['591 campos', '44 novos', 'obrigatória em 01/12/2026']],
      ['10', false, ['600 campos']],
      ['8', false, ['547 campos']],
    ])
  })

  it('sem anterior para comparar nem data de obrigatoriedade, a vigente fica só com os campos', () => {
    const semData = versao('9', 'Vigente', 1)
    const cartoes = montarCartoesDeVersao(
      indice({
        vigente: semData,
        versoes: [semData],
        novidades: {
          versao: semData,
          anterior: null,
          descricao: null,
          camposNovos: 1,
          camposDescontinuados: 0,
        },
      }),
    )

    expect(cartoes.map((cartao) => cartao.fatos)).toEqual([['1 campo']])
  })

  it('sem vigente, mantém a ordem do backend', () => {
    const cartoes = montarCartoesDeVersao(indice({ vigente: null, novidades: null }))

    expect(cartoes.map((cartao) => [cartao.versao.slug, cartao.ehVigente])).toEqual([
      ['10', false],
      ['9', false],
      ['8', false],
    ])
  })
})
