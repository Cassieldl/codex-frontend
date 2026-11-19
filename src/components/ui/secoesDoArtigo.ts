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

const LINHA_DO_SELETOR = /^>\s*\[!SELETOR\]/

/**
 * Regex de linha em vez de `remark`: `##` em bloco de código sobra no sumário, mas seção real nunca
 * falta. Os h3 que viram opção de um seletor ficam de fora: só um deles aparece por vez.
 */
export function extrairSecoesDoCorpo(corpo: string): ItemSumarioArtigo[] {
  const itens: ItemSumarioArtigo[] = []
  let dentroDoSeletor = false

  for (const linha of corpo.split('\n')) {
    const aparada = linha.trim()
    if (LINHA_DO_SELETOR.test(aparada)) dentroDoSeletor = true

    const resultado = LINHA_TITULO.exec(aparada)
    if (!resultado) continue

    const nivel = resultado[1].length as 2 | 3
    if (nivel === 2) dentroDoSeletor = false
    if (nivel === 3 && dentroDoSeletor) continue

    const titulo = resultado[2].trim()
    itens.push({ nivel, titulo, ancora: gerarAncoraSecao(titulo) })
  }

  return itens
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

/** Posição da seção cuja âncora está no endereço (`#secao-...`), ou `-1`. */
export function secaoDaAncora(titulos: readonly string[], hash: string): number {
  let ancora: string
  try {
    ancora = decodeURIComponent(hash.replace(/^#/, ''))
  } catch {
    return -1
  }
  if (!ancora) return -1
  return titulos.findIndex((titulo) => gerarAncoraSecao(titulo) === ancora)
}
