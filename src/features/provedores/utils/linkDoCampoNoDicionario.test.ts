import { describe, expect, it } from 'vitest'
import { linkDoCampoNoDicionario } from './linkDoCampoNoDicionario'

describe('linkDoCampoNoDicionario', () => {
  it('leva ao verbete pela URL estável do campo no Layout InvoiCy', () => {
    expect(linkDoCampoNoDicionario({ campoLayoutSlug: 'servico-paipreservico' })).toEqual({
      to: '/layout/campos/$campoSlug',
      params: { campoSlug: 'servico-paipreservico' },
    })
  })

  it('campo sem correspondente no layout não tem link', () => {
    expect(linkDoCampoNoDicionario({ campoLayoutSlug: '  ' })).toBeNull()
  })
})
