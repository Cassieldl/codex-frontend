import type { TrechoResultado } from '../types/resultadoBusca'

/**
 * Remove a marcação Markdown que sobra nos trechos de resultado da busca.
 *
 * O corpo dos artigos é escrito em Markdown restrito e indexado como texto. Para o `tsvector` a
 * marcação é inofensiva — pontuação não vira lexema —, mas o `ts_headline` devolve o texto como
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
 * Nenhum texto é removido — só caracteres de sintaxe. Isso importa porque o destaque já foi
 * decidido pelo servidor, e apagar conteúdo deslocaria o que ele marcou.
 */

/**
 * `#` de título, em qualquer posição — não só no começo da linha.
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

/** Marcador de lista no começo da linha. */
const MARCADOR_DE_LISTA = /(^|\n)\s{0,3}[-*+]\s+/g

/** Citação em bloco no começo da linha. */
const CITACAO = /(^|\n)\s{0,3}>\s?/g

/**
 * Asteriscos que sobraram sem par depois da limpeza acima.
 *
 * O servidor corta o texto onde o destaque começa e termina, e o termo buscado costuma cair
 * DENTRO de um negrito — `define **` / `nome` / `** de cada campo`. Cada fragmento fica então
 * com metade da marcação, e a regra de par nunca casa.
 *
 * Só `*` entra aqui, nunca `_`: sublinhado solto é conteúdo legítimo num portal técnico
 * (`layout_version`, `codigo_municipio`), enquanto asterisco solto não aparece em texto de
 * verdade — é sempre marcação partida.
 */
const ASTERISCO_ORFAO = /\*+/g

/** Quebras e espaços seguidos viram um espaço só: o trecho é uma linha na tela. */
const ESPACO_EM_BRANCO = /\s+/g

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
  const limpos = trechos.map((trecho) => ({ ...trecho, texto: semMarcacao(trecho.texto) }))
  const ultimo = limpos.length - 1

  if (ultimo < 0) return limpos

  limpos[0] = { ...limpos[0]!, texto: limpos[0]!.texto.replace(/^\s+/, '') }
  limpos[ultimo] = { ...limpos[ultimo]!, texto: limpos[ultimo]!.texto.replace(/\s+$/, '') }

  return limpos
}
