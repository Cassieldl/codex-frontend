import { describe, expect, it } from 'vitest'
import { ORIGENS_LINK, comOrigem } from './origemLink'

describe('comOrigem', () => {
  it('acrescenta ?origem= quando o caminho ainda não tem query string', () => {
    expect(comOrigem('/erros/e0117', ORIGENS_LINK.atendimento)).toBe(
      '/erros/e0117?origem=atendimento',
    )
  })

  it('acrescenta &origem= quando o caminho já tem query string', () => {
    expect(comOrigem('/busca?q=e0117', ORIGENS_LINK.atendimento)).toBe(
      '/busca?q=e0117&origem=atendimento',
    )
  })
})
