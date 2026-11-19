import { describe, expect, it } from 'vitest'
import cssGlobal from './global.css?raw'

const fontes = import.meta.glob<string>(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

const fontesDoPortal = Object.entries(fontes).filter(
  ([caminho]) => !caminho.includes('/features/interno/') && !caminho.includes('/routes/interno/'),
)

// Prefixos de utilitário que pintam com token de cor. O token precisa vir logo depois do prefixo:
// `bg-alert-error` não conta como uso de `error`.
const PREFIXOS_DE_COR =
  '(?:bg|text|border(?:-[trblxys])?|divide|outline|ring|fill|stroke|decoration)'

function usaToken(nome: string): boolean {
  const utilitario = new RegExp(`(?<![\\w-])${PREFIXOS_DE_COR}-${nome}(?:\\/\\d+)?(?![\\w-])`)
  const variavel = `var(--color-${nome})`

  return (
    Object.values(fontes).some((fonte) => utilitario.test(fonte) || fonte.includes(variavel)) ||
    cssGlobal.includes(variavel)
  )
}

describe('tokens do global.css', () => {
  it('a varredura enxerga os arquivos do portal', () => {
    expect(fontesDoPortal.length).toBeGreaterThan(100)
  })

  it('todo token de cor tem uso: token sem uso some do CSS', () => {
    const tokens = [...cssGlobal.matchAll(/--color-([a-z0-9-]+):\s*#/g)].map((achado) => achado[1])

    expect(tokens.length).toBeGreaterThan(20)
    expect(tokens.filter((nome) => !usaToken(nome))).toEqual([])
  })
})

describe('páginas públicas', () => {
  it('a largura vem de um ponto só: nenhuma página usa max-w-6xl', () => {
    const comLarguraAntiga = fontesDoPortal
      .filter(([, fonte]) => /(?<![\w-])max-w-6xl(?![\w-])/.test(fonte))
      .map(([caminho]) => caminho)

    expect(comLarguraAntiga).toEqual([])
    expect(cssGlobal).toMatch(/--container-pagina:\s*1264px/)
  })

  it('nenhum texto abaixo de 12px', () => {
    const abaixoDoMinimo = fontesDoPortal.flatMap(([caminho, fonte]) =>
      [...fonte.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)]
        .filter((achado) => Number(achado[1]) < 12)
        .map((achado) => `${caminho}: ${achado[0]}`),
    )

    expect(abaixoDoMinimo).toEqual([])
  })
})
