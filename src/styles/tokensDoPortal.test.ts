import { describe, expect, it } from 'vitest'
import { calcularContraste, comporSobre, CONTRASTE_MINIMO } from '../utils/contraste'
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

/**
 * Fundos de aviso lidos do CSS: `--color-alert-<tom>` sem sufixo. Um tom novo entra na conta
 * sozinho; borda, texto e ícone (`-borda`, `-texto`, `-icone`) ficam de fora.
 */
function fundosDeAviso(): string[] {
  return [...cssGlobal.matchAll(/--color-(alert-[a-z]+):\s*#/g)].map((achado) => achado[1])
}

// Fundos em que o portal põe texto com link: página, avisos, bloco realçado e linha da âncora.
const FUNDOS_COM_LINK = ['white', 'surface-hover', 'highlight-anchor', ...fundosDeAviso()]

// Pega `hover:`, `group-hover:`, `group-hover/nome:`, `peer-hover:`, `has-[...]:hover:`,
// `[&:hover]:` e o `!` de importante, antes ou depois da classe.
const HOVER_PARA_PRIMARY_LIGHT =
  /(?<![\w-])(?:(?:(?:group|peer)-)?hover(?:\/[\w-]+)?|\[&:hover\]):!?text-primary-light!?(?![\w-])/

describe('links do portal', () => {
  const cores = coresDoLinkTexto()

  it('a utility link-texto pinta três estados: normal, visitado e hover', () => {
    expect(cores).toHaveLength(3)
  })

  it('os fundos de aviso vêm do CSS: os quatro tons atuais estão na conta', () => {
    expect(fundosDeAviso()).toEqual(
      expect.arrayContaining(['alert-info', 'alert-warning', 'alert-error', 'alert-success']),
    )
    expect(fundosDeAviso().every((fundo) => !/-(?:borda|texto|icone)$/.test(fundo))).toBe(true)
  })

  it.each([
    'hover:text-primary-light',
    'group-hover:text-primary-light',
    'group-hover/linha:text-primary-light',
    'has-[a:focus]:hover:text-primary-light',
    '[&:hover]:text-primary-light',
    'hover:!text-primary-light',
    'hover:text-primary-light!',
  ])('a varredura de hover reconhece `%s`', (classe) => {
    expect(HOVER_PARA_PRIMARY_LIGHT.test(`className="${classe}"`)).toBe(true)
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
      .filter(([, fonte]) => HOVER_PARA_PRIMARY_LIGHT.test(fonte))
      .map(([caminho]) => caminho)

    expect(comHoverFraco).toEqual([])
  })
})

/** Raio de uma caixa de aviso: o token `radius-*` quando vem dele, a classe crua quando não. */
function raioDoAviso(classes: string): string | null {
  const porToken = classes.match(/(?<![\w-])rounded-\[var\(--(radius-[a-z]+)\)\]/)
  if (porToken) return porToken[1]
  return classes.match(/(?<![\w-])rounded(?:-[^\s"'`]+)?/)?.[0] ?? null
}

// Cartão lateral com tom de aviso e selo em pílula: uma ocorrência de cada.
const RAIOS_DE_AVISO_FORA_DO_TOKEN_ACEITOS = [
  '../features/provedores/components/LateralDaNatureza.tsx: radius-card',
  '../features/provedores/components/ModalDoCampo.tsx: radius-pill',
]

describe('avisos', () => {
  it('o raio dos avisos vem de um token de 12px', () => {
    expect(cssGlobal).toMatch(/--radius-aviso:\s*12px;/)
  })

  it.each([
    '../components/ui/AlertaMigrate.tsx',
    '../components/ui/Toast.tsx',
    '../features/interno/provedores/components/TrocarSlugProvedor.tsx',
    '../features/interno/artigos/pages/artigos.tsx',
    '../features/interno/comunicados/pages/comunicados.tsx',
  ])('%s usa o raio de aviso', (caminho) => {
    expect(fontes[caminho]).toContain('rounded-[var(--radius-aviso)]')
  })

  it('cada caixa de aviso usa o raio de aviso, nem na área interna; card e pill só nas exceções', () => {
    // Por aviso, não por arquivo: um segundo aviso com outro raio no mesmo arquivo entra na lista.
    const foraDoPadrao = Object.entries(fontes).flatMap(([caminho, fonte]) =>
      [...fonte.matchAll(/["'`][^"'`]*\bborder-alert-[a-z]+-borda\b[^"'`]*["'`]/g)]
        .map((achado) => raioDoAviso(achado[0]))
        .filter((raio): raio is string => raio !== null && raio !== 'radius-aviso')
        .map((raio) => `${caminho}: ${raio}`),
    )

    expect(foraDoPadrao.sort()).toEqual(RAIOS_DE_AVISO_FORA_DO_TOKEN_ACEITOS)
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

  it('o main com largura máxima usa max-w-pagina: texto longo limita a medida dentro dele', () => {
    const mainsComLarguraPropria = fontesDoPortal.flatMap(([caminho, fonte]) =>
      [...fonte.matchAll(/<main\b[^>]*?className="([^"]*)"/g)]
        .map((achado) => achado[1])
        .filter((classes) => /(?<![\w-])max-w-(?!pagina(?![\w-]))/.test(classes))
        .map((classes) => `${caminho}: ${classes}`),
    )

    expect(mainsComLarguraPropria).toEqual([])
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

describe('cabeçalho e rodapé escuros', () => {
  const cabecalho = fontes['../components/layout/CabecalhoPublico.tsx']
  const pontosDeLuz = fontes['../components/layout/PontosDeLuz.tsx']
  const sobrelinha = fontes['../components/ui/Sobrelinha.tsx']
  const home = fontes['../features/home/routes/home.tsx']
  const rodape = fontes['../components/layout/RodapeContextual.tsx']

  const TEXTO_ACCENT = /(?<![\w-])(?:[\w[\]=-]+:)?text-accent(?![\w-])/
  const TEXTO_ACCENT_SOBRE_ESCURO = /(?<![\w-])text-accent-sobre-escuro(?![\w-])/

  it('a sobrelinha do hero usa o tom de texto sobre escuro, nunca o accent', () => {
    expect(sobrelinha).toMatch(/'escura' \? 'text-accent-sobre-escuro'/)
    expect(sobrelinha).not.toMatch(TEXTO_ACCENT)
    expect(home).toMatch(/<Sobrelinha>Portal técnico de integração NFS-e<\/Sobrelinha>/)
    expect(home).not.toMatch(TEXTO_ACCENT)
  })

  it('o título de coluna do rodapé usa o tom de texto sobre escuro, nunca o accent', () => {
    const classeDoTitulo = rodape.match(/const CLASSE_TITULO_COLUNA\s*=\s*'([^']*)'/)?.[1] ?? ''

    expect(classeDoTitulo).toMatch(TEXTO_ACCENT_SOBRE_ESCURO)
    expect(classeDoTitulo).not.toMatch(TEXTO_ACCENT)
    expect(rodape).toMatch(/<h2 className=\{CLASSE_TITULO_COLUNA\}>Migrate<\/h2>/)
  })

  /** O fundo mais claro que os pontos de luz produzem: o azul-claro na maior opacidade, sem blur. */
  function fundoMaisClaroDoCabecalho(): string {
    const opacidades = [...pontosDeLuz.matchAll(/bg-primary-light\/(\d+)/g)].map((achado) =>
      Number(achado[1]),
    )
    expect(opacidades.length).toBeGreaterThan(0)

    return comporSobre(
      corDoToken('primary-light'),
      corDoToken('primary'),
      Math.max(...opacidades) / 100,
    )
  }

  it('o texto laranja da nav usa o tom de texto sobre escuro, nunca o accent', () => {
    expect(cabecalho).toMatch(/data-\[secao=atual\]:text-accent-sobre-escuro(?![\w-])/)
    expect(cabecalho).toMatch(/hover:text-accent-sobre-escuro(?![\w-])/)
    expect(cabecalho).not.toMatch(/(?<![\w-])(?:[\w[\]=-]+:)?text-accent(?![\w-])/)
  })

  it('o laranja de texto sobre escuro atinge 4.5:1 no ponto mais claro dos pontos de luz', () => {
    expect(
      calcularContraste(corDoToken('accent-sobre-escuro'), fundoMaisClaroDoCabecalho()),
    ).toBeGreaterThanOrEqual(CONTRASTE_MINIMO.textoNormal)
  })
})
