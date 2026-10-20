import { describe, expect, it } from 'vitest'

// Varredura em vez de teste por tela, para a próxima tela com lixeira não nascer sem confirmação.
const FONTES = import.meta.glob('./**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** `aria-label={`Remover ...`}`: o rótulo padrão das ações destrutivas da área interna. */
const ACAO_DE_REMOCAO = /aria-label=\{`Remover /

/**
 * Remover uma linha de formulário ainda não salvo (uma variante de mensagem, por exemplo) não
 * toca o servidor: desfazer é digitar de novo. Só a remoção persistida exige confirmação.
 */
const FORMULARIOS_EM_MEMORIA = [
  '/erros/components/ErroForm.tsx',
  // Tirar um vínculo do formulário de artigo só vale ao salvar.
  '/artigos/components/ListaDeVinculos.tsx',
]

function arquivosComRemocao(): string[] {
  return Object.entries(FONTES)
    .filter(([caminho]) => !caminho.endsWith('.test.tsx'))
    .filter(([caminho]) => !FORMULARIOS_EM_MEMORIA.some((isento) => caminho.endsWith(isento)))
    .filter(([, conteudo]) => ACAO_DE_REMOCAO.test(conteudo))
    .map(([caminho]) => caminho)
    .sort()
}

describe('área interna: confirmação antes de remover', () => {
  it('a varredura enxerga as telas com ação de remoção', () => {
    // Sem este caso, um glob que parasse de casar deixaria o teste abaixo passar por vazio, e a
    // guarda viraria decoração sem ninguém perceber.
    expect(arquivosComRemocao().length).toBeGreaterThanOrEqual(7)
  })

  it('toda tela com remoção usa ModalConfirmacao', () => {
    const semConfirmacao = arquivosComRemocao().filter(
      (caminho) => !FONTES[caminho].includes('ModalConfirmacao'),
    )

    expect(semConfirmacao).toEqual([])
  })
})

// Ter o `ModalConfirmacao` no arquivo não prova nada: a lixeira pode chamar `.mutate` direto.
const FONTES_DO_APP = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const CHAMADA_DE_HOOK_DE_REMOCAO = /\buseRemover[A-Z]\w*\(/g
const LIGACAO_NOMEADA = /const (\w+) = $/
// As props do diálogo têm `=>` e `!==`, então o limite é o próximo `<ModalConfirmacao`, não o `>`.
const CONFIRMACAO_NO_DIALOGO =
  /<ModalConfirmacao\b(?:(?!<ModalConfirmacao)[\s\S])*?\bonConfirm=\{([^}]*)\}/g

interface LigacaoDeRemocao {
  arquivo: string
  nome: string
}

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '')
}

function arquivosDeProducao(): [string, string][] {
  return Object.entries(FONTES_DO_APP)
    .filter(([caminho]) => !/\.test\.tsx?$/.test(caminho) && !caminho.startsWith('/src/test/'))
    .map(([caminho, fonte]) => [caminho, semComentarios(fonte)])
}

function ocorrencias(fonte: string, padrao: RegExp): number[] {
  return [...fonte.matchAll(padrao)].map((casamento) => casamento.index)
}

/** Índice logo após o delimitador que fecha o que abre em `inicio`, contando aninhamento. */
function fimDoBloco(fonte: string, inicio: number, abre: string, fecha: string): number {
  let profundidade = 0

  for (let indice = inicio; indice < fonte.length; indice++) {
    if (fonte[indice] === abre) profundidade++
    if (fonte[indice] === fecha) profundidade--
    if (profundidade === 0) return indice + 1
  }

  return -1
}

function corpoDaFuncao(fonte: string, nome: string): [number, number] | null {
  const declaracao = new RegExp(`function ${nome}\\(`).exec(fonte)
  if (!declaracao) return null

  const fimDosParametros = fimDoBloco(fonte, declaracao.index + declaracao[0].length - 1, '(', ')')
  const inicioDoCorpo = fonte.indexOf('{', fimDosParametros)

  return [inicioDoCorpo, fimDoBloco(fonte, inicioDoCorpo, '{', '}')]
}

function ligacoesDeRemocao(): LigacaoDeRemocao[] {
  return arquivosDeProducao().flatMap(([arquivo, fonte]) =>
    ocorrencias(fonte, CHAMADA_DE_HOOK_DE_REMOCAO)
      .filter((indice) => !fonte.slice(0, indice).endsWith('function '))
      .map((indice) => ({
        arquivo,
        nome: LIGACAO_NOMEADA.exec(fonte.slice(0, indice))?.[1] ?? '(sem nome)',
      })),
  )
}

function violacoesDoArquivo(arquivo: string, nomes: string[]): string[] {
  const fonte = semComentarios(FONTES_DO_APP[arquivo])
  const violacoes: string[] = []
  const corpos: [number, number][] = []

  for (const [, expressao] of fonte.matchAll(CONFIRMACAO_NO_DIALOGO)) {
    const handler = expressao.trim()
    const corpo = /^\w+$/.test(handler) ? corpoDaFuncao(fonte, handler) : null

    if (!corpo) {
      violacoes.push(`${arquivo}: onConfirm={${handler}} não é uma function declarada no arquivo`)
      continue
    }

    corpos.push(corpo)
    const usos = ocorrencias(fonte, new RegExp(`\\b${handler}\\b`, 'g')).length
    const permitidos = 1 + ocorrencias(fonte, new RegExp(`onConfirm=\\{${handler}\\}`, 'g')).length
    if (usos !== permitidos) {
      violacoes.push(`${arquivo}: ${handler} é chamado fora do onConfirm`)
    }
  }

  for (const nome of nomes) {
    if (nome === '(sem nome)') {
      violacoes.push(`${arquivo}: useRemover* sem ligação nomeada (const x = useRemover...)`)
      continue
    }

    for (const uso of fonte.matchAll(new RegExp(`\\b${nome}\\b(\\.\\w+)?(\\()?`, 'g'))) {
      const [trecho, propriedade, chamada] = uso
      if (fonte.slice(0, uso.index).endsWith('const ')) continue
      if (propriedade && !/^\.mutate(Async)?$/.test(propriedade)) continue

      const dentroDeConfirmacao = corpos.some(
        ([inicio, fim]) => uso.index > inicio && uso.index < fim,
      )
      if (!propriedade || !chamada || !dentroDeConfirmacao) {
        violacoes.push(`${arquivo}: "${trecho}" fora do handler do onConfirm`)
      }
    }
  }

  return violacoes
}

describe('remoção persistida só dispara pelo onConfirm do ModalConfirmacao', () => {
  it('a varredura enxerga as ligações de useRemover*', () => {
    // Hoje são 8 ligações em 7 arquivos; um glob que parasse de casar não pode passar por vazio.
    const ligacoes = ligacoesDeRemocao()

    expect(ligacoes.length).toBeGreaterThanOrEqual(8)
    expect(new Set(ligacoes.map((ligacao) => ligacao.arquivo)).size).toBeGreaterThanOrEqual(7)
  })

  it('todo .mutate de useRemover* mora no handler do onConfirm, e esse handler não é chamado de outro lugar', () => {
    const nomesPorArquivo = new Map<string, string[]>()
    for (const { arquivo, nome } of ligacoesDeRemocao()) {
      nomesPorArquivo.set(arquivo, [...(nomesPorArquivo.get(arquivo) ?? []), nome])
    }

    const violacoes = [...nomesPorArquivo].flatMap(([arquivo, nomes]) =>
      violacoesDoArquivo(arquivo, nomes),
    )

    expect(violacoes).toEqual([])
  })
})
