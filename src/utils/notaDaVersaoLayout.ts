export interface TopicoDaNotaLayout {
  rotulo: string
  texto: string
}

export interface NotaDaVersaoLayout {
  resumo: string | null
  topicos: TopicoDaNotaLayout[]
}

const LINHA_DE_TOPICO = /^([^:]{1,40}):\s+(.+)$/

/**
 * Lê a nota de uma versão do Layout InvoiCy. Linha no formato "Rótulo: texto" vira tópico; o
 * resto forma o resumo. Nota antiga, em parágrafo único, vira só resumo.
 */
export function lerNotaDaVersaoLayout(descricao: string | null): NotaDaVersaoLayout {
  const linhas = (descricao ?? '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)

  const resumo: string[] = []
  const topicos: TopicoDaNotaLayout[] = []

  for (const linha of linhas) {
    const topico = LINHA_DE_TOPICO.exec(linha)
    if (topico) topicos.push({ rotulo: topico[1].trim(), texto: topico[2].trim() })
    else resumo.push(linha)
  }

  return { resumo: resumo.length > 0 ? resumo.join(' ') : null, topicos }
}
