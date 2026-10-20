export interface ItemSumarioArtigo {
  nivel: 2 | 3
  titulo: string
  ancora: string
}

const LINHA_TITULO = /^(#{2,3})\s+(.+)$/
// Escape Unicode em vez do caractere literal: encoding divergente do arquivo n\u00e3o quebra a compila\u00e7\u00e3o.
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g

/** \u00c2ncora da se\u00e7\u00e3o; `ConteudoArtigo` usa a mesma fun\u00e7\u00e3o, sen\u00e3o o link do sum\u00e1rio erra o alvo. */
export function gerarAncoraSecao(titulo: string): string {
  const normalizado = titulo
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `secao-${normalizado}`
}

/** Regex de linha em vez de `remark`: `##` em bloco de código sobra no sumário, mas seção real nunca falta. */
export function extrairSecoesDoCorpo(corpo: string): ItemSumarioArtigo[] {
  return corpo
    .split('\n')
    .map((linha) => LINHA_TITULO.exec(linha.trim()))
    .filter((resultado): resultado is RegExpExecArray => resultado !== null)
    .map((resultado) => {
      const titulo = resultado[2].trim()
      return {
        nivel: resultado[1].length as 2 | 3,
        titulo,
        ancora: gerarAncoraSecao(titulo),
      }
    })
}

export interface TopicoSumario extends ItemSumarioArtigo {
  subtopicos: ItemSumarioArtigo[]
}

/** Agrupa cada h3 sob o h2 anterior; h3 antes de qualquer h2 vira tópico, para o sumário nunca perder seção. */
export function agruparSecoes(itens: ItemSumarioArtigo[]): TopicoSumario[] {
  const topicos: TopicoSumario[] = []
  for (const item of itens) {
    const ultimo = topicos.at(-1)
    if (item.nivel === 3 && ultimo) ultimo.subtopicos.push(item)
    else topicos.push({ ...item, subtopicos: [] })
  }
  return topicos
}
