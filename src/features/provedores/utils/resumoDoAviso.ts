import type { AvisoPublico, SeveridadeAviso } from '../types/provedor'

const PESO_DA_SEVERIDADE: Record<SeveridadeAviso, number> = {
  Critico: 0,
  Alerta: 1,
  Informativo: 2,
}

/** Crítico, atenção e informação, nessa ordem. Empate mantém a ordem que a API mandou. */
export function ordenarAvisosPorGravidade<Aviso extends Pick<AvisoPublico, 'severidade'>>(
  avisos: readonly Aviso[],
): Aviso[] {
  return avisos
    .map((aviso, posicao) => ({ aviso, posicao }))
    .sort(
      (a, b) =>
        PESO_DA_SEVERIDADE[a.aviso.severidade] - PESO_DA_SEVERIDADE[b.aviso.severidade] ||
        a.posicao - b.posicao,
    )
    .map(({ aviso }) => aviso)
}

const LINHA_DE_TITULO = /^\s{0,3}#{1,6}\s/

const MARCADOR_DE_BLOCO = /\[![A-Z]+\]/g

const IMAGEM = /!\[[^\]]*\]\([^)]*\)/g

const LINK = /\[([^\]]+)\]\([^)]*\)/g

const CITACAO_OU_LISTA = /^\s{0,3}(?:>\s?|[-*+]\s+|\d+[.)]\s+)+/

const ENFASE_COM_ASTERISCO = /(\*{1,3})(?=\S)([\s\S]*?\S)\1/g

// Só fora de palavra: `layout_version` é nome de tag, não ênfase.
const ENFASE_COM_SUBLINHADO = /(?<!\w)(_{1,3})(?=\S)([\s\S]*?\S)\1(?!\w)/g

const CODIGO = /`{1,3}([^`]*)`{1,3}/g

const ASTERISCO_ORFAO = /\*+/g

const FIM_DE_FRASE = /^[\s\S]*?[.!?](?=\s|$)/

function semMarcacao(linha: string): string {
  return linha
    .replace(MARCADOR_DE_BLOCO, '')
    .replace(IMAGEM, '')
    .replace(LINK, '$1')
    .replace(CITACAO_OU_LISTA, '')
    .replace(ENFASE_COM_ASTERISCO, '$2')
    .replace(ENFASE_COM_SUBLINHADO, '$2')
    .replace(CODIGO, '$1')
    .replace(ASTERISCO_ORFAO, '')
}

/**
 * Primeira frase do corpo do aviso, em texto puro, para o cartão fechado. O corpo é Markdown:
 * a marcação sai e os títulos são pulados, porque o aviso já tem título próprio. Sem ponto final,
 * vale o primeiro parágrafo inteiro; o cartão corta o excesso na tela.
 */
export function primeiraFraseDoAviso(corpo: string): string {
  const paragrafos = corpo.split(/\n\s*\n/)

  for (const paragrafo of paragrafos) {
    const texto = paragrafo
      .split('\n')
      .filter((linha) => !LINHA_DE_TITULO.test(linha))
      .map(semMarcacao)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (texto === '') continue

    return FIM_DE_FRASE.exec(texto)?.[0] ?? texto
  }

  return ''
}
