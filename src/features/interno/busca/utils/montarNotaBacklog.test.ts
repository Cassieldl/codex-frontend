import { describe, expect, it } from 'vitest'
import { montarNotaBacklog } from './montarNotaBacklog'

describe('montarNotaBacklog', () => {
  it('monta a nota com todos os campos preenchidos', () => {
    expect(
      montarNotaBacklog({
        termo: 'E0117',
        parceiro: 'Prefeitura de Exemplo',
        chamado: '#4521',
        dataFormatada: '29/08/2026',
      }),
    ).toBe('E0117 · Prefeitura de Exemplo · #4521 · 29/08/2026')
  })

  it('usa os textos padrão quando parceiro/chamado estão vazios', () => {
    expect(
      montarNotaBacklog({ termo: 'E0117', parceiro: '', chamado: '', dataFormatada: '29/08/2026' }),
    ).toBe('E0117 · sem parceiro informado · sem chamado informado · 29/08/2026')
  })

  it('ignora espaços em branco puros como se estivessem vazios', () => {
    expect(
      montarNotaBacklog({
        termo: 'E0117',
        parceiro: '   ',
        chamado: '  ',
        dataFormatada: '29/08/2026',
      }),
    ).toBe('E0117 · sem parceiro informado · sem chamado informado · 29/08/2026')
  })
})
