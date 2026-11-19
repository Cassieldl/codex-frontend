export interface CorpoComResumo {
  /** Citação `> [!RESUMO]` do início do corpo, ou `null` quando o artigo não abre com ela. */
  resumo: string | null
  /** O corpo sem o resumo. */
  restante: string
}

const INICIO_DO_RESUMO = /^>\s*\[!RESUMO\]/

/**
 * Separa o resumo que abre o artigo para o cabeçalho mostrar antes da linha de verificação. Só a
 * citação que é o primeiro bloco do corpo conta; resumo no meio do texto fica onde está.
 */
export function separarResumo(corpo: string): CorpoComResumo {
  const linhas = corpo.split('\n')
  const inicio = linhas.findIndex((linha) => linha.trim() !== '')
  if (inicio < 0 || !INICIO_DO_RESUMO.test(linhas[inicio].trim())) {
    return { resumo: null, restante: corpo }
  }

  let fim = inicio
  while (fim < linhas.length && linhas[fim].trim().startsWith('>')) fim++

  return {
    resumo: linhas.slice(inicio, fim).join('\n'),
    restante: linhas
      .slice(fim)
      .join('\n')
      .replace(/^\s*\n/, ''),
  }
}
