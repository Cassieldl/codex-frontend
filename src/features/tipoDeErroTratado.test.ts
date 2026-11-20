import { describe, expect, it } from 'vitest'

/**
 * Todo tipo de erro que um hook público classifica precisa ser consumido por
 * alguma tela.
 *
 * O defeito que motivou isto não aparece em revisão: `useProvedorPorSlug`
 * declarava `TipoErroProvedor = 'nao_encontrado' | 'despublicado'`, construía os
 * dois, e a tela só tinha ramo para `despublicado`. Um provedor inexistente caía
 * no `ErrorState` genérico ("Não foi possível carregar esta informação agora. /
 * Tentar novamente"), que promete que insistir resolve. A página de versão
 * deixava DOIS tipos mortos assim (`nao_encontrado` e `limite_excedido`), e o
 * próprio repositório já trazia a regra escrita no componente irmão dos artigos:
 * "página que **explica**, nunca 404 mudo".
 *
 * Cada arquivo está coerente consigo mesmo - o hook classifica certo, a tela
 * trata o que trata. Só a comparação entre os dois expõe o tipo órfão, e é isso
 * que esta varredura faz.
 */
const FONTES_HOOKS = import.meta.glob('./**/hooks/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const FONTES_TELAS = import.meta.glob(['./**/*.tsx', '../routes/**/*.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

/**
 * `export type TipoErroX = 'a' | 'b' | 'c'`, em uma linha ou quebrado em várias.
 *
 * O limite é a primeira linha em branco, não o `;`: o projeto não usa ponto e
 * vírgula, e `[^;]+` engolia o arquivo inteiro - a varredura passava a "achar"
 * os literais de `classificarErro` como se fossem declarações.
 */
const DECLARACAO_DE_TIPO_DE_ERRO = /export type Tipo\w*Erro\w*\s*=([\s\S]*?)\n\s*\n/g
const LITERAL = /'([a-z_]+)'/g

interface TipoDeErroDeclarado {
  arquivo: string
  literal: string
}

function tiposDeErroDeclarados(): TipoDeErroDeclarado[] {
  const declarados = new Map<string, TipoDeErroDeclarado>()

  for (const [arquivo, fonte] of Object.entries(FONTES_HOOKS)) {
    if (arquivo.endsWith('.test.ts')) continue

    for (const declaracao of fonte.matchAll(DECLARACAO_DE_TIPO_DE_ERRO)) {
      for (const literal of declaracao[1].matchAll(LITERAL)) {
        declarados.set(`${arquivo}:${literal[1]}`, { arquivo, literal: literal[1] })
      }
    }
  }

  return [...declarados.values()]
}

function telasDeProducao(): string[] {
  return Object.keys(FONTES_TELAS).filter((caminho) => !caminho.endsWith('.test.tsx'))
}

/**
 * A fonte sem comentários.
 *
 * Citar o literal numa docstring não é tratá-lo - e justamente a docstring que
 * EXPLICA o defeito cita os tipos envolvidos, então a guarda se dava por
 * satisfeita pelo texto que descreve o problema que ela existe para pegar. Só a
 * mutação mostrou.
 */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

/** `./provedores/hooks/useProvedorPorSlug.ts` → `useProvedorPorSlug`. */
function nomeDoModulo(caminho: string): string {
  return caminho.split('/').pop()!.replace(/\.ts$/, '')
}

/**
 * As telas que importam AQUELE hook - e só elas.
 *
 * Duas aproximações mais frouxas foram tentadas antes e as duas ficaram
 * inertes, cada uma provada pela mutação: buscar o literal em toda a base
 * (`nao_encontrado` é declarado por quatro hooks, então uma tela qualquer
 * tratá-lo dava por cobertas todas as outras) e buscar na mesma feature (os
 * dois hooks de provedor declaram o MESMO literal, então um cobria o outro).
 *
 * O vínculo que importa é o do import: quem lê o erro daquele hook é quem
 * precisa saber o que fazer com cada tipo dele.
 */
function telasQueImportam(hook: string): string[] {
  const importa = new RegExp(`\\b${nomeDoModulo(hook)}\\b`)

  return telasDeProducao()
    .map((caminho) => semComentarios(FONTES_TELAS[caminho]))
    .filter((fonte) => importa.test(fonte))
}

describe('tipo de erro classificado tem tela que o trata', () => {
  it('a varredura enxerga os tipos de erro dos hooks', () => {
    // Sem contar o universo, um glob que parasse de casar deixaria o caso
    // abaixo passar por vazio - a terceira guarda inerte desta base.
    expect(tiposDeErroDeclarados().length).toBeGreaterThanOrEqual(8)
  })

  it('a varredura enxerga as telas', () => {
    expect(telasDeProducao().length).toBeGreaterThanOrEqual(30)
  })

  it('nenhum tipo declarado fica sem consumidor entre as telas que usam o hook', () => {
    // Palavra inteira, não `'literal'`: a tela pode consumir o tipo comparando
    // (`tipo === 'nao_encontrado'`) ou como chave de um mapa de destinos
    // (`nao_encontrado: 'versao-nao-encontrada'`) - as duas contam.
    const orfaos = tiposDeErroDeclarados()
      .filter(({ arquivo, literal }) => {
        const consumo = new RegExp(`\\b${literal}\\b`)
        return !telasQueImportam(arquivo).some((fonte) => consumo.test(fonte))
      })
      .map(({ arquivo, literal }) => `${arquivo}: '${literal}'`)

    expect(orfaos).toEqual([])
  })
})
