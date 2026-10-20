import { describe, expect, it } from 'vitest'

// Sem mostrar a falha, um 409 ou 422 só para o spinner e o usuário não sabe o que houve.
const FONTES_DO_APP = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const ESCRITA = /\buseMutation\s*[(<]|\bcriarUsePublicar\s*[(<]/
const FABRICA_DE_HOOKS = '/src/features/interno/hooks/criarUsePublicar.ts'
const HOOK_EXPORTADO = /export\s+(?:function|const)\s+(use[A-Z]\w*)/g

interface Chamada {
  arquivo: string
  ligacao: string
  argumentos: string
}

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[ \t])\/\/[^\n]*/gm, '$1')
}

function deProducao(caminho: string): boolean {
  return !/\.test\.tsx?$/.test(caminho) && !caminho.startsWith('/src/test/')
}

function hooksDeEscrita(): string[] {
  return Object.entries(FONTES_DO_APP)
    .filter(([caminho]) => deProducao(caminho) && caminho !== FABRICA_DE_HOOKS)
    .filter(([, fonte]) => ESCRITA.test(fonte))
    .flatMap(([, fonte]) => [...fonte.matchAll(HOOK_EXPORTADO)].map((exportado) => exportado[1]))
    .sort()
}

function telas(): [string, string][] {
  return Object.entries(FONTES_DO_APP)
    .filter(([caminho]) => caminho.endsWith('.tsx') && deProducao(caminho))
    .map(([caminho, fonte]) => [caminho, semComentarios(fonte)])
}

/** Índice logo após o `)` que fecha o `(` em `inicio`, contando aninhamento. */
function fimDosArgumentos(fonte: string, inicio: number): number {
  let profundidade = 0

  for (let indice = inicio; indice < fonte.length; indice++) {
    if (fonte[indice] === '(') profundidade++
    if (fonte[indice] === ')') profundidade--
    if (profundidade === 0) return indice + 1
  }

  return fonte.length
}

/** Nome de cada `const x = useHook(` do arquivo, ou o erro de uma ligação que não dá para seguir. */
function ligacoes(fonte: string, hooks: string[]): { nomes: string[]; violacoes: string[] } {
  const nomes: string[] = []
  const violacoes: string[] = []
  const chamada = new RegExp(`(?<![\\w.])(${hooks.join('|')})\\s*\\(`, 'g')

  for (const uso of fonte.matchAll(chamada)) {
    const antes = fonte.slice(0, uso.index)
    const nomeado = /const (\w+) = $/.exec(antes)
    if (nomeado) nomes.push(nomeado[1])
    else violacoes.push(`${uso[1]}() sem ligação nomeada (const x = ${uso[1]}())`)
  }

  return { nomes, violacoes }
}

function chamadasDeMutate(arquivo: string, fonte: string, ligacao: string): Chamada[] {
  const chamadas: Chamada[] = []

  for (const uso of fonte.matchAll(new RegExp(`\\b${ligacao}\\.mutate(?:Async)?\\b`, 'g'))) {
    // `typeof x.mutate` é tipo, não chamada.
    if (fonte.slice(0, uso.index).endsWith('typeof ')) continue

    const abre = uso.index + uso[0].length
    const argumentos = fonte[abre] === '(' ? fonte.slice(abre, fimDosArgumentos(fonte, abre)) : ''
    chamadas.push({ arquivo, ligacao, argumentos })
  }

  return chamadas
}

function varredura(): { chamadas: Chamada[]; violacoes: string[] } {
  const hooks = hooksDeEscrita()
  const chamadas: Chamada[] = []
  const violacoes: string[] = []

  for (const [arquivo, fonte] of telas()) {
    const encontradas = ligacoes(fonte, hooks)
    violacoes.push(...encontradas.violacoes.map((violacao) => `${arquivo}: ${violacao}`))

    for (const ligacao of encontradas.nomes) {
      const doArquivo = chamadasDeMutate(arquivo, fonte, ligacao)
      chamadas.push(...doArquivo)

      const renderizaFalha = new RegExp(`\\b${ligacao}\\.(?:error|isError)\\b`).test(fonte)
      for (const { argumentos } of doArquivo) {
        if (/\bonError\s*:/.test(argumentos) || renderizaFalha) continue
        violacoes.push(`${arquivo}: ${ligacao}.mutate sem onError e sem ${ligacao}.error na tela`)
      }
    }
  }

  return { chamadas, violacoes }
}

describe('área interna: falha de escrita aparece para o usuário', () => {
  it('a varredura enxerga os hooks de escrita e as chamadas das telas', () => {
    // Um glob ou uma expressão que parasse de casar deixaria a guarda passar por vazio.
    const { chamadas } = varredura()

    expect(hooksDeEscrita().length).toBeGreaterThanOrEqual(41)
    expect(chamadas.length).toBeGreaterThanOrEqual(45)
    expect(new Set(chamadas.map((chamada) => chamada.arquivo)).size).toBeGreaterThanOrEqual(13)
  })

  it('todo .mutate de hook de escrita tem onError ou a tela renderiza o .error do hook', () => {
    expect(varredura().violacoes).toEqual([])
  })
})
