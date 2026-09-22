import { describe, expect, it } from 'vitest'
import { corrigirUrlCanonica } from './corrigirUrlCanonica'

describe('corrigirUrlCanonica', () => {
  it('devolve null quando o caminho canônico já é o caminho atual', () => {
    expect(
      corrigirUrlCanonica('/provedores/prefeitura-exemplo', '/provedores/prefeitura-exemplo'),
    ).toBeNull()
  })

  it('devolve o destino com replace:true quando o caminho diverge e é seguro', () => {
    expect(corrigirUrlCanonica('/provedores/slug-antigo', '/provedores/slug-novo')).toEqual({
      href: '/provedores/slug-novo',
      replace: true,
    })
  })

  it('devolve null quando o canônico é um caminho externo disfarçado (javascript:)', () => {
    expect(corrigirUrlCanonica('/provedores/slug-antigo', 'javascript:alert(1)')).toBeNull()
  })

  it('devolve null quando o canônico é protocol-relative (//evil.com)', () => {
    expect(corrigirUrlCanonica('/provedores/slug-antigo', '//evil.com')).toBeNull()
  })

  // Mutação-alvo: se `corrigirUrlCanonica` parasse de validar por
  // `caminhoInternoSeguro` (ex.: devolvesse `{ href: caminhoCanonico, replace: true }`
  // direto), este teste cairia — é o que prova que o saneador está de fato no caminho.
  it('nunca propaga um destino que caminhoInternoSeguro rejeitaria', () => {
    expect(corrigirUrlCanonica('/erros/e0117', '/\\evil.com')).toBeNull()
  })
})
