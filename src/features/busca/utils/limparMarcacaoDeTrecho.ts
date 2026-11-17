import type { TrechoResultado } from '../types/resultadoBusca'

/**
 * Remove a marcação Markdown que sobra nos trechos de resultado da busca.
 *
 * O corpo dos artigos é escrito em Markdown restrito e indexado como texto. Para o `tsvector` a
 * marcação é inofensiva (pontuação não vira lexema), mas o `ts_headline` devolve o texto como
 * ele está no banco, então o trecho chegava à tela assim:
 *
 * ```text
 * Layout InvoiCy é, e o que ele não é ## Vocabulário, não comportamento
 * O Layout InvoiCy define **nome, caminho no XML e significado** de cada campo.
 * ```
 *
 * Quem lê um resultado de busca não deveria ver a sintaxe do editor.
 *
 * A função recebe a LISTA inteira, e não cada trecho isolado, porque os trechos são fragmentos
 * **consecutivos** de uma frase só: o servidor corta o texto onde começa e termina o destaque,
 * então `["Inscrição ", "municipal", " inválida"]` é uma frase, não três. Aparar cada fragmento
 * por conta própria colaria as palavras vizinhas ("Inscriçãomunicipalinválida"). Aqui o espaço
 * interno é preservado e só as pontas do conjunto são aparadas.
 *
 * Nenhum texto é removido, só caracteres de sintaxe e o endereço dos links. Isso importa porque o
 * destaque já foi decidido pelo servidor, e apagar conteúdo deslocaria o que ele marcou.
 */

/**
 * `#` de título, em qualquer posição, não só no começo da linha.
 *
 * O `ts_headline` corta o texto onde o casamento manda, então o marcador chega no MEIO do
 * trecho ("...e o que ele não é ## Vocabulário, não comportamento"). Exigir início de linha
 * deixava passar exatamente o caso que aparece na tela.
 *
 * O espaço obrigatório depois do `#` é o que separa marcação de conteúdo legítimo: "erro #123"
 * não casa, e continua na tela como a pessoa escreveu.
 */
const TITULO = /(^|\s)#{1,6}\s+/g

/** Ênfase por `*` ou `_`, de um a três, preservando o texto entre elas. */
const ENFASE = /([*_]{1,3})(?=\S)([\s\S]*?\S)\1/g

/** Código em craseamento simples ou triplo. */
const CODIGO = /`{1,3}([^`]*)`{1,3}/g

/** Marcador de lista no começo da linha. O recuo não inclui a quebra, que separa as palavras. */
const MARCADOR_DE_LISTA = /(^|\n)[ \t]{0,3}[-*+][ \t]+/g

/** Citação em bloco no começo da linha. */
const CITACAO = /(^|\n)[ \t]{0,3}>[ \t]?/g

/**
 * Asteriscos que sobraram sem par depois da limpeza acima.
 *
 * O servidor corta o texto onde o destaque começa e termina, e o termo buscado costuma cair
 * DENTRO de um negrito: `define **` / `nome` / `** de cada campo`. Cada fragmento fica então
 * com metade da marcação, e a regra de par nunca casa.
 *
 * Só `*` entra aqui, nunca `_`: sublinhado solto é conteúdo legítimo num portal técnico
 * (`layout_version`, `codigo_municipio`), enquanto asterisco solto não aparece em texto de
 * verdade: é sempre marcação partida.
 */
const ASTERISCO_ORFAO = /\*+/g

/** Quebras e espaços seguidos viram um espaço só: o trecho é uma linha na tela. */
const ESPACO_EM_BRANCO = /\s+/g

/** Marcador de bloco do artigo, como `[!CARTOES]`. Não come a quebra: a citação seguinte usa. */
const MARCADOR_DE_BLOCO = /\[![A-Z]+\][ \t]*/g

/** Link Markdown: fica só o texto entre colchetes. */
const LINK = /\[([^\]\n]*)\]\([^)\s]*\)/g

/** Barra que separa título, texto e ação no cartão. `||` é operador, não separador. */
const BARRA_DO_CARTAO = /(?<!\|)[ \t]*\|(?!\|)[ \t]*/g

const TERMINA_COM_PONTUACAO = /[.!?:;]$/

interface Substituicao {
  inicio: number
  fim: number
  texto: string
}

/**
 * Marcação que o servidor pode partir entre fragmentos: o link cujo texto é o termo buscado
 * chega como `[Ex.: ` / `E157` / `](/busca?q=E157)`. Por isso estas regras rodam no texto
 * inteiro, e cada troca volta ao fragmento onde começa.
 */
function substituicoesNoConjunto(texto: string): Substituicao[] {
  const substituicoes: Substituicao[] = []

  for (const casamento of texto.matchAll(MARCADOR_DE_BLOCO)) {
    substituicoes.push({
      inicio: casamento.index,
      fim: casamento.index + casamento[0].length,
      texto: '',
    })
  }

  for (const casamento of texto.matchAll(LINK)) {
    const fimDoRotulo = casamento.index + 1 + casamento[1].length
    substituicoes.push({ inicio: casamento.index, fim: casamento.index + 1, texto: '' })
    substituicoes.push({
      inicio: fimDoRotulo,
      fim: casamento.index + casamento[0].length,
      texto: '',
    })
  }

  for (const casamento of texto.matchAll(BARRA_DO_CARTAO)) {
    const antes = texto.slice(0, casamento.index).trimEnd()
    const separador = antes === '' || TERMINA_COM_PONTUACAO.test(antes) ? ' ' : '. '
    substituicoes.push({
      inicio: casamento.index,
      fim: casamento.index + casamento[0].length,
      texto: separador,
    })
  }

  return substituicoes
}

function semMarcacaoPartida(trechos: readonly TrechoResultado[]): TrechoResultado[] {
  const caracteres = trechos.flatMap((trecho) => trecho.texto.split(''))
  const saida: string[] = [...caracteres]

  for (const { inicio, fim, texto } of substituicoesNoConjunto(caracteres.join(''))) {
    for (let posicao = inicio; posicao < fim; posicao++) saida[posicao] = ''
    if (inicio < fim) saida[inicio] = texto
  }

  let posicao = 0
  return trechos.map((trecho) => {
    const tamanho = trecho.texto.length
    const texto = saida.slice(posicao, posicao + tamanho).join('')
    posicao += tamanho
    return { ...trecho, texto }
  })
}

function semMarcacao(texto: string): string {
  return texto
    .replace(TITULO, '$1')
    .replace(CITACAO, '$1')
    .replace(MARCADOR_DE_LISTA, '$1')
    .replace(ENFASE, '$2')
    .replace(CODIGO, '$1')
    .replace(ASTERISCO_ORFAO, '')
    .replace(ESPACO_EM_BRANCO, ' ')
}

export function limparMarcacaoDosTrechos(trechos: readonly TrechoResultado[]): TrechoResultado[] {
  // O destaque que caiu dentro da URL de um link some com ela: fragmento vazio não vira `<mark>`.
  const limpos = semMarcacaoPartida(trechos)
    .map((trecho) => ({ ...trecho, texto: semMarcacao(trecho.texto) }))
    .filter((trecho) => trecho.texto !== '')
  const ultimo = limpos.length - 1

  if (ultimo < 0) return limpos

  limpos[0] = { ...limpos[0], texto: limpos[0].texto.replace(/^\s+/, '') }
  limpos[ultimo] = { ...limpos[ultimo], texto: limpos[ultimo].texto.replace(/\s+$/, '') }

  return limpos
}
