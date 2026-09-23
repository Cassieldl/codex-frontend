/**
 * Contraste de cor pela fórmula do WCAG 2.1 (relative luminance + contrast ratio).
 *
 * Existe para que conformidade de cor seja **medida por teste**, não conferida a olho: uma cor
 * "que parece clarinha demais" é opinião; 4.16 contra o mínimo de 4.5 é fato. Foi assim que os 79
 * usos de texto abaixo de AA apareceram — cada um, isolado, parecia deliberado.
 *
 * Referência: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

/** Mínimos do WCAG 2.1 nível AA. */
export const CONTRASTE_MINIMO = {
  /** 1.4.3 — texto abaixo de 24px (ou 18.66px em negrito). */
  textoNormal: 4.5,
  /** 1.4.3 — texto grande: a partir de 24px, ou 18.66px em negrito. */
  textoGrande: 3,
  /** 1.4.11 — limites e indicadores de componentes de interface. */
  naoTextual: 3,
} as const

export type CanalRgb = readonly [number, number, number]

/** `#rrggbb` → canais 0–255. Aceita maiúsculas e o `#` opcional. */
export function converterHexParaRgb(hex: string): CanalRgb {
  const limpo = hex.replace('#', '').trim()

  if (!/^[0-9a-fA-F]{6}$/.test(limpo)) {
    throw new Error(`Cor inválida: "${hex}". Esperado formato #rrggbb.`)
  }

  return [
    Number.parseInt(limpo.slice(0, 2), 16),
    Number.parseInt(limpo.slice(2, 4), 16),
    Number.parseInt(limpo.slice(4, 6), 16),
  ] as const
}

/**
 * Compõe uma cor semitransparente sobre um fundo opaco. É o que o navegador faz com
 * `text-ink/60`: o valor final não é o token, é a mistura — e é a mistura que precisa ser medida.
 */
export function comporSobre(corFrente: string, corFundo: string, opacidade: number): string {
  if (opacidade < 0 || opacidade > 1) {
    throw new Error(`Opacidade fora de 0..1: ${opacidade}.`)
  }

  const frente = converterHexParaRgb(corFrente)
  const fundo = converterHexParaRgb(corFundo)

  const canais = frente.map((valor, indice) =>
    Math.round(opacidade * valor + (1 - opacidade) * fundo[indice]),
  )

  return `#${canais.map((canal) => canal.toString(16).padStart(2, '0')).join('')}`
}

function calcularLuminanciaRelativa(cor: string): number {
  const [vermelho, verde, azul] = converterHexParaRgb(cor).map((canal) => {
    const normalizado = canal / 255
    return normalizado <= 0.03928
      ? normalizado / 12.92
      : Math.pow((normalizado + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * vermelho + 0.7152 * verde + 0.0722 * azul
}

/** Razão de contraste entre duas cores opacas — de 1 (idênticas) a 21 (preto sobre branco). */
export function calcularContraste(corA: string, corB: string): number {
  const [maior, menor] = [calcularLuminanciaRelativa(corA), calcularLuminanciaRelativa(corB)].sort(
    (a, b) => b - a,
  )

  return (maior + 0.05) / (menor + 0.05)
}
