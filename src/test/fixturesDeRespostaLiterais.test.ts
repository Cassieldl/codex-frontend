import { describe, expect, it } from 'vitest'

// Fixture anotada com o tipo do cliente concorda com ele mesmo quando o DTO real é outro.

const FONTES = import.meta.glob(['../**/*.test.{ts,tsx}', './mocks/*.ts', '!./mocks/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

const IDENTIFICADOR = /[A-Za-z_$][\w$]*/g
const FECHAMENTO: Record<string, string> = { '(': ')', '{': '}', '[': ']' }

interface Declaracao {
  nome: string
  tipo: string
  corpo: string
  parametros: string
}

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[ \t])\/\/[^\n]*/gm, '$1')
}

function indiceDoFechamento(fonte: string, inicio: number): number {
  const abre = fonte[inicio]
  const fecha = FECHAMENTO[abre]
  let profundidade = 0

  for (let indice = inicio; indice < fonte.length; indice++) {
    if (fonte[indice] === abre) profundidade++
    else if (fonte[indice] === fecha && --profundidade === 0) return indice
  }

  return fonte.length
}

function argumentosDeJson(fonte: string): string[] {
  const argumentos: string[] = []

  for (const chamada of fonte.matchAll(/HttpResponse\.json\s*(<)?/g)) {
    const depoisDoNome = chamada.index + chamada[0].length
    const parenteses = fonte.indexOf('(', depoisDoNome)
    if (chamada[1]) argumentos.push('<' + fonte.slice(depoisDoNome, parenteses))
    argumentos.push(fonte.slice(parenteses, indiceDoFechamento(fonte, parenteses) + 1))
  }

  return argumentos
}

function tiposImportadosDoProjeto(fonte: string): Set<string> {
  const tipos = new Set<string>()

  for (const importacao of fonte.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
    const origem = importacao[2]
    if (!/^(\.|@\/)/.test(origem) || /(^|\/)test\//.test(origem)) continue

    for (const parte of importacao[1].split(',')) {
      const nome = parte
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .pop()
      if (nome && /^[A-Z]/.test(nome)) tipos.add(nome)
    }
  }

  return tipos
}

// O valor termina na quebra de linha fora de parênteses, salvo linha que continua a expressão.
function valorDaDeclaracao(fonte: string, desde: number): string {
  let profundidade = 0

  for (let indice = desde; indice < fonte.length; indice++) {
    const caractere = fonte[indice]
    if ('([{'.includes(caractere)) profundidade++
    else if (')]}'.includes(caractere)) {
      if (profundidade === 0) return fonte.slice(desde, indice)
      profundidade--
    } else if (caractere === '\n' && profundidade === 0 && indice > desde) {
      const resto = fonte.slice(indice + 1).trimStart()
      if (fonte.slice(desde, indice).trim() && !/^[.?:|&+]/.test(resto)) {
        return fonte.slice(desde, indice)
      }
    }
  }

  return fonte.slice(desde)
}

function declaracoes(fonte: string): Declaracao[] {
  const encontradas: Declaracao[] = []

  for (const constante of fonte.matchAll(
    /\b(?:const|let)\s+(\w+)\s*(?::\s*([^=\n]+?))?\s*=(?![=>])/g,
  )) {
    const corpo = valorDaDeclaracao(fonte, constante.index + constante[0].length)
    const seta = corpo.match(/^\s*(?:async\s*)?\(/)
    let parametros = ''
    let retorno = ''

    if (seta) {
      const abre = seta[0].length - 1
      parametros = corpo.slice(abre, indiceDoFechamento(corpo, abre) + 1)
      retorno = corpo.slice(abre + parametros.length).match(/^\s*:\s*([^=]+?)\s*=>/)?.[1] ?? ''
    }

    encontradas.push({ nome: constante[1], tipo: constante[2] ?? retorno, corpo, parametros })
  }

  for (const funcao of fonte.matchAll(/\bfunction\s+(\w+)\s*(?:<[^>]*>)?\s*\(/g)) {
    const abreParametros = funcao.index + funcao[0].length - 1
    const fechaParametros = indiceDoFechamento(fonte, abreParametros)
    const assinatura = fonte.slice(fechaParametros + 1).match(/^\s*(?::\s*([^{]+?))?\s*\{/)
    if (!assinatura) continue

    const abreCorpo = fechaParametros + assinatura[0].length
    encontradas.push({
      nome: funcao[1],
      tipo: assinatura[1] ?? '',
      corpo: fonte.slice(funcao.index, indiceDoFechamento(fonte, abreCorpo) + 1),
      parametros: fonte.slice(abreParametros, fechaParametros + 1),
    })
  }

  return encontradas
}

function parametrosTipados(parametros: string): { nome: string; tipo: string }[] {
  const tipados: { nome: string; tipo: string }[] = []
  const lista = parametros.slice(1, -1)
  const parametro = /(?:^|,)\s*(?:\{[^}]*\}|(\w+))\??\s*:\s*((?:[^,=()<>{}]|<[^>]*>|\{[^}]*\})+)/g

  for (const encontrado of lista.matchAll(parametro)) {
    if (encontrado[1]) tipados.push({ nome: encontrado[1], tipo: encontrado[2] })
  }

  return tipados
}

function argumentosDasChamadas(fonte: string, nome: string): string[] {
  return [...fonte.matchAll(new RegExp(`(?<![\\w.])${nome}\\s*\\(`, 'g'))].map((chamada) => {
    const abre = chamada.index + chamada[0].length - 1
    return fonte.slice(abre, indiceDoFechamento(fonte, abre) + 1)
  })
}

function produzResposta(declaracao: Declaracao): boolean {
  return /HttpResponse\.json/.test(declaracao.corpo)
}

// Funções exportadas por src/test/mocks que montam a resposta do MSW.
function produtoresCompartilhados(fontes: Record<string, string>): string[] {
  return Object.entries(fontes)
    .filter(([arquivo]) => arquivo.startsWith('./mocks/'))
    .flatMap(([, bruta]) => {
      const fonte = semComentarios(bruta)
      return declaracoes(fonte)
        .filter(produzResposta)
        .filter(({ nome }) => new RegExp(`export\\s+function\\s+${nome}\\b`).test(fonte))
        .map(({ nome }) => nome)
    })
}

// Devolve null quando o arquivo não responde pelo MSW.
function fixturesTipadas(bruta: string, produtoresExternos: string[] = []): string[] | null {
  const fonte = semComentarios(bruta)
  const raizes = argumentosDeJson(fonte)
  if (raizes.length === 0) return null

  const todas = declaracoes(fonte)
  const produtores = new Set(todas.filter(produzResposta).map(({ nome }) => nome))
  for (const externo of produtoresExternos) if (fonte.includes(externo)) produtores.add(externo)
  for (const produtor of produtores) raizes.push(...argumentosDasChamadas(fonte, produtor))

  return infracoesDoAlcance(fonte, todas, raizes, produtores)
}

// O teste importa a fixture de src/test/mocks e a entrega por caminhos que a varredura do arquivo não segue.
function fixturesExportadasTipadas(bruta: string): string[] {
  const fonte = semComentarios(bruta)
  const todas = declaracoes(fonte)
  const exportadas = todas
    .map(({ nome }) => nome)
    .filter((nome) => new RegExp(`export\\s+(?:const|let|function)\\s+${nome}\\b`).test(fonte))

  return infracoesDoAlcance(fonte, todas, exportadas, new Set())
}

function infracoesDoAlcance(
  fonte: string,
  todas: Declaracao[],
  raizes: string[],
  produtores: Set<string>,
): string[] {
  const tipos = tiposImportadosDoProjeto(fonte)
  const alcancados = new Set<string>()
  const visitadas = new Set<Declaracao>()
  const textosAlcancados = [...raizes]
  for (const raiz of raizes)
    for (const nome of raiz.match(IDENTIFICADOR) ?? []) alcancados.add(nome)

  let cresceu = true
  while (cresceu) {
    cresceu = false
    for (const declaracao of todas) {
      if (!alcancados.has(declaracao.nome) || visitadas.has(declaracao)) continue
      visitadas.add(declaracao)
      textosAlcancados.push(declaracao.corpo)
      for (const nome of declaracao.corpo.match(IDENTIFICADOR) ?? []) alcancados.add(nome)
      cresceu = true
    }
  }

  const tipoImportado = (anotacao: string) =>
    (anotacao.match(IDENTIFICADOR) ?? []).find((nome) => tipos.has(nome))
  const infracoes: string[] = []

  for (const declaracao of todas) {
    const tipo = tipoImportado(declaracao.tipo)
    if (tipo && visitadas.has(declaracao)) infracoes.push(`${declaracao.nome}: ${tipo}`)
    if (!produtores.has(declaracao.nome)) continue

    for (const parametro of parametrosTipados(declaracao.parametros)) {
      const tipoDoParametro = tipoImportado(parametro.tipo)
      if (tipoDoParametro)
        infracoes.push(`${declaracao.nome}(${parametro.nome}: ${tipoDoParametro})`)
    }
  }

  const assercao = /\bsatisfies\s+([^\n=;]+)|[}\])]\s*as\s+([^\n=;]+)|^<([^(]*)/g
  for (const texto of textosAlcancados) {
    for (const encontrada of texto.matchAll(assercao)) {
      const tipo = tipoImportado(encontrada[1] ?? encontrada[2] ?? encontrada[3])
      if (tipo) infracoes.push(`asserção ${tipo}`)
    }
  }

  return [...new Set(infracoes)]
}

function ehModuloDeMock(arquivo: string): boolean {
  return arquivo.startsWith('./mocks/') && !arquivo.endsWith('.test.ts')
}

function universo(): [string, string[]][] {
  const externos = produtoresCompartilhados(FONTES)

  return Object.entries(FONTES)
    .filter(([arquivo]) => !arquivo.endsWith('/fixturesDeRespostaLiterais.test.ts'))
    .map(([arquivo, fonte]): [string, string[] | null] => {
      const doArquivo = fixturesTipadas(fonte, externos)
      if (!ehModuloDeMock(arquivo)) return [arquivo, doArquivo]
      return [arquivo, [...new Set([...(doArquivo ?? []), ...fixturesExportadasTipadas(fonte)])]]
    })
    .filter((entrada): entrada is [string, string[]] => entrada[1] !== null)
}

describe('fixture de resposta do MSW é JSON literal, sem o tipo do cliente', () => {
  it('a varredura enxerga os arquivos que respondem pelo MSW', () => {
    expect(universo().length).toBeGreaterThanOrEqual(80)
  })

  it('a varredura enxerga os produtores compartilhados de src/test/mocks', () => {
    expect(produtoresCompartilhados(FONTES)).toEqual(
      expect.arrayContaining(['handlerArtigoDetalhe', 'handlerHomeSucesso', 'handlerBuscaVazia']),
    )
  })

  it('o detector reprova cada forma de anotação que chega à resposta', () => {
    const cabecalho =
      "import { HttpResponse } from 'msw'\nimport type { Dto } from '../types/dto'\n"

    expect(
      fixturesTipadas(`${cabecalho}const x: Dto = { a: 1 }\nHttpResponse.json({ data: x })`),
    ).toEqual(['x: Dto'])
    expect(
      fixturesTipadas(
        `${cabecalho}function montar(): Dto {\n  return { a: 1 }\n}\nHttpResponse.json(montar())`,
      ),
    ).toEqual(['montar: Dto'])
    expect(
      fixturesTipadas(
        `${cabecalho}function servir(v: Dto) {\n  return HttpResponse.json(v)\n}\nservir({ a: 1 })`,
      ),
    ).toEqual(['servir(v: Dto)'])
    expect(fixturesTipadas(`${cabecalho}HttpResponse.json({ a: 1 } satisfies Dto)`)).toEqual([
      'asserção Dto',
    ])
    expect(fixturesTipadas(`${cabecalho}const x = { a: 1 } as Dto\nHttpResponse.json(x)`)).toEqual([
      'asserção Dto',
    ])
    expect(
      fixturesTipadas(`${cabecalho}HttpResponse.json({ data: x } satisfies { data: Dto })`),
    ).toEqual(['asserção Dto'])
    expect(
      fixturesTipadas(`${cabecalho}const x: { data: Dto[] } = { data: [] }\nHttpResponse.json(x)`),
    ).toEqual(['x: Dto'])
  })

  it('a varredura enxerga as constantes exportadas de src/test/mocks', () => {
    expect(universo().map(([arquivo]) => arquivo)).toEqual(
      expect.arrayContaining(['./mocks/respostasEscritaInterna.ts', './mocks/lacunasBusca.ts']),
    )
  })

  it('o detector reprova constante exportada de src/test/mocks anotada com o tipo do cliente', () => {
    const cabecalho = "import type { Dto } from '../../features/x/types/dto'\n"

    expect(fixturesExportadasTipadas(`${cabecalho}export const dto: Dto = { a: 1 }`)).toEqual([
      'dto: Dto',
    ])
    expect(
      fixturesExportadasTipadas(
        `${cabecalho}const base: Dto = { a: 1 }\nexport const dto = { ...base, b: 2 }`,
      ),
    ).toEqual(['base: Dto'])
    expect(fixturesExportadasTipadas(`${cabecalho}export const dto = { a: 1 } as Dto`)).toEqual([
      'asserção Dto',
    ])
    expect(fixturesExportadasTipadas(`${cabecalho}export const dto = { a: 1 }`)).toEqual([])
  })

  it('o detector aceita o literal e o tipo que não chega à resposta', () => {
    const cabecalho =
      "import { HttpResponse } from 'msw'\nimport type { Dto } from '../types/dto'\n"

    expect(
      fixturesTipadas(`${cabecalho}const x = { a: 1 }\nHttpResponse.json({ data: x })`),
    ).toEqual([])
    expect(
      fixturesTipadas(
        `${cabecalho}const entrada: Dto = { a: 1 }\nusar(entrada)\nHttpResponse.json({})`,
      ),
    ).toEqual([])
  })

  it('nenhum arquivo de teste entrega ao MSW fixture anotada com o tipo do cliente', () => {
    const infracoes = universo()
      .filter(([, encontradas]) => encontradas.length > 0)
      .map(([arquivo, encontradas]) => `${arquivo}: ${encontradas.join(', ')}`)

    expect(infracoes).toEqual([])
  })
})
