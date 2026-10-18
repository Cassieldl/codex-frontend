import { describe, expect, it } from 'vitest'

/**
 * Hook que classifica o erro por status (`class Erro*Http`) precisa desistir na hora desse erro.
 * Sem `retry` próprio vale o padrão do `QueryClient` de produção (três retentativas com espera):
 * 404, 410 e 422 não mudam por insistência, e a página fica segundos no skeleton, sem `h1`, antes
 * de dizer que o endereço não existe. Os testes de página usam `retry: false` e não veem isso.
 */
const FONTES_HOOKS = import.meta.glob('./**/hooks/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

function hooksQueClassificamErro(): [string, string][] {
  return Object.entries(FONTES_HOOKS)
    .filter(([arquivo]) => !arquivo.endsWith('.test.ts'))
    .map(([arquivo, fonte]): [string, string] => [arquivo, semComentarios(fonte)])
    .filter(([, fonte]) => /\bclass Erro\w*Http\b/.test(fonte))
}

describe('erro classificado não é retentado', () => {
  it('a varredura enxerga os hooks que classificam erro', () => {
    expect(hooksQueClassificamErro().length).toBeGreaterThanOrEqual(4)
  })

  it('todo hook que classifica erro entrega a classificação à política de retentativa', () => {
    const semPolitica = hooksQueClassificamErro()
      .filter(([, fonte]) => !/retry:\s*\([^)]*\)\s*=>\s*devoRetentar\(/.test(fonte))
      .map(([arquivo]) => arquivo)

    expect(semPolitica).toEqual([])
  })
})
