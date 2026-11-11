import { describe, expect, it } from 'vitest'

const fontesDoPortal = import.meta.glob<string>(['../**/*.tsx', '!../**/*.test.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

// Opacidade em texto apaga a página: `text-ink/70` mede 4,16:1 e reprova AA. Texto secundário usa
// `text-muted`; a área interna ainda não passou pela troca e fica fora da varredura.
const OPACIDADE_EM_TEXTO = /\btext-(ink|white)\/\d+/g

describe('texto do portal público sem opacidade', () => {
  it('nenhum componente público usa text-ink/NN nem text-white/NN', () => {
    const ocorrencias = Object.entries(fontesDoPortal)
      .filter(([caminho]) => !caminho.includes('/features/interno/'))
      .flatMap(([caminho, fonte]) =>
        [...fonte.matchAll(OPACIDADE_EM_TEXTO)].map((achado) => `${caminho}: ${achado[0]}`),
      )

    expect(ocorrencias).toEqual([])
  })

  it('a varredura enxerga os arquivos do portal', () => {
    expect(Object.keys(fontesDoPortal).length).toBeGreaterThan(100)
    expect(
      Object.keys(fontesDoPortal).some((caminho) => caminho.endsWith('RodapeContextual.tsx')),
    ).toBe(true)
  })
})
