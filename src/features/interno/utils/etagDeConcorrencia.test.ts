import { describe, expect, it } from 'vitest'
import {
  comEtagDeConcorrencia,
  comEtagDeConcorrenciaNaColecao,
  formatarEtagConcorrencia,
} from './etagDeConcorrencia'

/**
 * Réplica da leitura que o backend faz do header em
 * `Codex.API/Common/IfMatchExtensoes.cs:ExigirIfMatch` - `TrimStart('W', '/')`,
 * `Trim('"')` e `uint.TryParse`.
 *
 * Existe para provar o ida-e-volta: o que esta util escreve é exatamente o que
 * aquele parser lê de volta. Se o backend mudar o formato aceito, este teste
 * fica verde por engano - por isso o `formatarEtagConcorrencia` também é
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
    ['limite superior do uint32: não pode virar notação exponencial', 4_294_967_295],
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

  it('não muta o objeto recebido - a resposta da query permanece o corpo cru', () => {
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

/**
 * Toda coleção que passa por aqui é obrigatória no contrato, então a ausência é defeito, não caso
 * de borda: engolir com lista vazia faria a tela perder o bloco sem dizer nada - a manifestação
 * silenciosa, que nas três ocorrências desta base (`versoes`, `avisos`, `campoLayoutNome`) foi
 * sempre a que demorou a aparecer. A mensagem nomeia o campo porque era o que faltava para o
 * sintoma apontar para algum lugar.
 */
describe('comEtagDeConcorrenciaNaColecao', () => {
  it('deriva o etag de cada item da coleção', () => {
    const itens = [{ versaoConcorrencia: 3 }, { versaoConcorrencia: 7 }]

    expect(comEtagDeConcorrenciaNaColecao(itens, 'items').map((item) => item.etag)).toEqual([
      'W/"3"',
      'W/"7"',
    ])
  })

  it('coleção vazia é resultado legítimo, e não erro', () => {
    expect(comEtagDeConcorrenciaNaColecao([], 'avisos')).toEqual([])
  })

  it('coleção ausente lança nomeando o campo do contrato', () => {
    expect(() => comEtagDeConcorrenciaNaColecao(undefined, 'avisos')).toThrow(/"avisos"/)
    expect(() => comEtagDeConcorrenciaNaColecao(null, 'campos')).toThrow(/"campos"/)
  })
})

/**
 * Guarda estrutural: o `.map(comEtagDeConcorrencia)` direto é a forma perigosa, e proteger só os
 * pontos já encontrados deixaria o próximo hook nascer com o mesmo defeito - que não aparece em
 * teste nenhum, porque depende de o servidor omitir um campo.
 */
describe('área interna: nenhum hook mapeia coleção sem a guarda', () => {
  const FONTES = import.meta.glob('../**/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  })

  function arquivosDeHook(): string[] {
    return (
      Object.keys(FONTES)
        .filter((caminho) => !caminho.endsWith('.test.ts'))
        // O próprio helper contém o `.map(comEtagDeConcorrencia)`: é a implementação da guarda.
        .filter((caminho) => !caminho.endsWith('etagDeConcorrencia.ts'))
        .sort()
    )
  }

  it('a varredura enxerga os hooks da área interna', () => {
    // Sem este caso, um glob que parasse de casar deixaria o teste abaixo passar por vazio.
    expect(arquivosDeHook().length).toBeGreaterThanOrEqual(10)
  })

  it('usa sempre comEtagDeConcorrenciaNaColecao para coleções', () => {
    const comMapDireto = arquivosDeHook().filter((caminho) =>
      /\.map\(comEtagDeConcorrencia\)/.test(FONTES[caminho]),
    )

    expect(comMapDireto).toEqual([])
  })
})
