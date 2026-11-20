import { describe, expect, it } from 'vitest'
import { calcularContraste, CONTRASTE_MINIMO } from '../utils/contraste'
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

function corDoToken(nome: string): string {
  const achado = cssGlobal.match(new RegExp(`--color-${nome}:\\s*(#[0-9a-fA-F]{6})`))
  if (!achado) throw new Error(`Token --color-${nome} não encontrado em global.css.`)
  return achado[1]
}

/** Tokens que a utility `link-texto` pinta (normal, visitado e hover), lidos do próprio CSS. */
function coresDoLinkTexto(): string[] {
  const bloco = cssGlobal.match(/@utility link-texto\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
  return [...bloco.matchAll(/(?<![\w-])color:\s*var\(--color-([a-z0-9-]+)\)/g)].map(
    (achado) => achado[1],
  )
}

// Fundos em que o portal põe texto com link: página, avisos, bloco realçado e linha da âncora.
const FUNDOS_COM_LINK = [
  'white',
  'alert-info',
  'alert-warning',
  'alert-error',
  'alert-success',
  'surface-hover',
  'highlight-anchor',
]

describe('links do portal', () => {
  const cores = coresDoLinkTexto()

  it('a utility link-texto pinta três estados: normal, visitado e hover', () => {
    expect(cores).toHaveLength(3)
  })

  it.each(cores.flatMap((cor) => FUNDOS_COM_LINK.map((fundo) => [cor, fundo])))(
    'link `%s` sobre `%s` atinge 4.5:1',
    (cor, fundo) => {
      expect(calcularContraste(corDoToken(cor), corDoToken(fundo))).toBeGreaterThanOrEqual(
        CONTRASTE_MINIMO.textoNormal,
      )
    },
  )

  it('nenhum texto vira primary-light no hover: ele dá 3,99:1 sobre o azul suave', () => {
    const comHoverFraco = fontesDoPortal
      .filter(([, fonte]) => /(?<![\w-])hover:text-primary-light(?![\w-])/.test(fonte))
      .map(([caminho]) => caminho)

    expect(comHoverFraco).toEqual([])
  })
})

describe('avisos', () => {
  it('o raio dos avisos vem de um token de 12px', () => {
    expect(cssGlobal).toMatch(/--radius-aviso:\s*12px;/)
  })

  it.each(['../components/ui/AlertaMigrate.tsx', '../components/ui/Toast.tsx'])(
    '%s usa o raio de aviso',
    (caminho) => {
      expect(fontes[caminho]).toContain('rounded-[var(--radius-aviso)]')
    },
  )

  it('caixa com fundo e borda de aviso não usa raio de controle nem raio solto', () => {
    const RAIOS_ACEITOS = /rounded-\[var\(--radius-(?:aviso|pill|card)\)\]/
    const foraDoPadrao = fontesDoPortal.flatMap(([caminho, fonte]) =>
      [...fonte.matchAll(/["'`][^"'`]*\bborder-alert-[a-z]+-borda\b[^"'`]*["'`]/g)]
        .map((achado) => achado[0])
        .filter((classes) => /(?<![\w-])rounded\b/.test(classes))
        .filter((classes) => !RAIOS_ACEITOS.test(classes))
        .map((classes) => `${caminho}: ${classes}`),
    )

    expect(foraDoPadrao).toEqual([])
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
