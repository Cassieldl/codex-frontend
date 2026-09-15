import { describe, expect, it } from 'vitest'
import { comEtagDeConcorrencia, formatarEtagConcorrencia } from './etagDeConcorrencia'

/**
 * Réplica da leitura que o backend faz do header em
 * `Codex.API/Common/IfMatchExtensoes.cs:ExigirIfMatch` — `TrimStart('W', '/')`,
 * `Trim('"')` e `uint.TryParse`.
 *
 * Existe para provar o ida-e-volta: o que esta util escreve é exatamente o que
 * aquele parser lê de volta. Se o backend mudar o formato aceito, este teste
 * fica verde por engano — por isso o `formatarEtagConcorrencia` também é
 * comparado ao literal esperado, e não só ao resultado do round-trip.
 */
function lerComoOBackendLe(valorDoHeader: string): number | null {
  const semPrefixoFraco = valorDoHeader
    .trim()
    .replace(/^[W/]+/, '')
    .replace(/^"|"$/g, '')
  return /^\d+$/.test(semPrefixoFraco) ? Number(semPrefixoFraco) : null
}

describe('formatarEtagConcorrencia', () => {
  it('escreve a ETag fraca no formato único do contrato', () => {
    expect(formatarEtagConcorrencia(12)).toBe('W/"12"')
  })

  it.each([
    ['limite inferior do uint do xmin', 0],
    ['valor corriqueiro', 12],
    ['limite superior do uint32 — não pode virar notação exponencial', 4_294_967_295],
  ])('%s: o backend lê de volta o mesmo número que foi escrito', (_caso, versao) => {
    const header = formatarEtagConcorrencia(versao)

    expect(header).toBe(`W/"${versao}"`)
    expect(header).not.toMatch(/[e+.,]/)
    expect(lerComoOBackendLe(header)).toBe(versao)
  })
})

describe('comEtagDeConcorrencia', () => {
  const recurso = { id: 7, nome: 'Prefeitura de Exemplo', publicado: false, versaoConcorrencia: 12 }

  it('acrescenta o etag derivado sem perder nenhum campo do recurso', () => {
    const comEtag = comEtagDeConcorrencia(recurso)

    expect(comEtag).toEqual({ ...recurso, etag: 'W/"12"' })
  })

  it('não muta o objeto recebido — a resposta da query permanece o corpo cru', () => {
    comEtagDeConcorrencia(recurso)

    expect(recurso).not.toHaveProperty('etag')
  })

  it('deriva de cada item o seu próprio validador, sem reaproveitar o do anterior', () => {
    const itens = [
      { id: 1, versaoConcorrencia: 12 },
      { id: 2, versaoConcorrencia: 8 },
    ]

    expect(itens.map(comEtagDeConcorrencia).map((item) => item.etag)).toEqual(['W/"12"', 'W/"8"'])
  })
})
