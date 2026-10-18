import { describe, expect, it } from 'vitest'

/**
 * Toda rota pública define o título da aba com o próprio assunto (WCAG 2.4.2). Sem isto, as
 * páginas ficavam com o mesmo título e eram indistinguíveis na aba, no favorito e no buscador.
 *
 * A rota é fina e quem chama `useTituloDaPagina` é a página em `features/`, então a varredura
 * segue os imports relativos a partir do arquivo de rota, só dentro de `routes/` e `features/`.
 * Componentes compartilhados (`components/`, `hooks/`) ficam de fora de propósito: o estado de
 * "não existe" chama o hook por dentro, e contar com ele daria por coberta a página cujo caminho
 * de sucesso não tem título.
 */
const FONTES_ROTAS = import.meta.glob('./**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const FONTES_FEATURES = import.meta.glob('../features/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const FONTES: Record<string, string> = { ...FONTES_ROTAS, ...FONTES_FEATURES }

const CHAMADA_COM_ASSUNTO = /\buseTituloDaPagina\((?!\s*null\s*\))/
const IMPORT_RELATIVO = /from\s+'(\.{1,2}\/[^']+)'/g

function ehTeste(caminho: string): boolean {
  return /\.test\.tsx?$/.test(caminho)
}

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

/** Rotas públicas que renderizam página: fora da área interna, sem a raiz e sem layout (`route.tsx`). */
function rotasPublicas(): string[] {
  return Object.keys(FONTES_ROTAS).filter(
    (caminho) =>
      !ehTeste(caminho) &&
      !caminho.startsWith('./interno/') &&
      caminho !== './__root.tsx' &&
      !caminho.endsWith('/route.tsx'),
  )
}

/** `./a/b.tsx` + `../c/d` → `./c/d`, com as chaves no mesmo formato do glob. */
function resolver(arquivo: string, importado: string): string {
  const segmentos = arquivo.split('/').slice(0, -1)
  for (const parte of importado.split('/')) {
    if (parte === '.') continue
    const ultimo = segmentos[segmentos.length - 1]
    if (parte === '..' && ultimo !== undefined && ultimo !== '.' && ultimo !== '..') {
      segmentos.pop()
    } else if (parte === '..' && ultimo === '.') {
      segmentos[segmentos.length - 1] = '..'
    } else {
      segmentos.push(parte)
    }
  }
  return segmentos.join('/')
}

function arquivoDoImport(arquivo: string, importado: string): string | undefined {
  const base = resolver(arquivo, importado)
  return [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`].find(
    (candidato) => candidato in FONTES && !ehTeste(candidato),
  )
}

function cadeiaDeImports(rota: string): string[] {
  const visitados = new Set<string>([rota])
  const pendentes = [rota]

  while (pendentes.length > 0) {
    const atual = pendentes.pop()!
    for (const [, importado] of semComentarios(FONTES[atual]).matchAll(IMPORT_RELATIVO)) {
      const destino = arquivoDoImport(atual, importado)
      if (destino && !visitados.has(destino)) {
        visitados.add(destino)
        pendentes.push(destino)
      }
    }
  }

  return [...visitados]
}

function defineTitulo(rota: string): boolean {
  return cadeiaDeImports(rota).some((arquivo) =>
    CHAMADA_COM_ASSUNTO.test(semComentarios(FONTES[arquivo])),
  )
}

describe('título da aba nas rotas públicas', () => {
  it('a varredura enxerga as rotas públicas', () => {
    // Sem contar o universo, um glob que parasse de casar deixaria o caso abaixo passar por vazio.
    expect(rotasPublicas().length).toBeGreaterThanOrEqual(13)
  })

  it('a varredura segue a rota até a página em features/', () => {
    expect(cadeiaDeImports('./layout/$versaoSlug.tsx')).toContain(
      '../features/layout/routes/layout-versao.tsx',
    )
  })

  it('toda rota pública chega a uma chamada de useTituloDaPagina com assunto', () => {
    expect(rotasPublicas().filter((rota) => !defineTitulo(rota))).toEqual([])
  })
})
