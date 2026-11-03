import { describe, expect, it } from 'vitest'
import cssGlobal from '../styles/global.css?raw'
import { calcularContraste, comporSobre, converterHexParaRgb, CONTRASTE_MINIMO } from './contraste'

/**
 * Os tokens vêm do CSS **de produção** (`?raw` entrega o arquivo como texto) — nunca de uma cópia
 * no teste. Copiar os valores faria o teste medir a cópia: mudar o token no produto e esquecer de
 * atualizar aqui manteria a suíte verde com a cor nova nunca medida.
 */
const CSS_GLOBAL = cssGlobal

function token(nome: string): string {
  const achado = CSS_GLOBAL.match(new RegExp(`--color-${nome}:\\s*(#[0-9a-fA-F]{6})`))

  if (!achado) throw new Error(`Token --color-${nome} não encontrado em global.css.`)

  return achado[1]
}

describe('cálculo de contraste', () => {
  it('reproduz os extremos conhecidos da fórmula do WCAG', () => {
    expect(calcularContraste('#000000', '#ffffff')).toBeCloseTo(21, 2)
    expect(calcularContraste('#ffffff', '#ffffff')).toBeCloseTo(1, 2)
  })

  it('é simétrico — a ordem das cores não muda a razão', () => {
    expect(calcularContraste('#1b2633', '#ffffff')).toBeCloseTo(
      calcularContraste('#ffffff', '#1b2633'),
      5,
    )
  })

  it('compõe cor semitransparente sobre o fundo, como o navegador faz', () => {
    // `text-ink/60` não pinta `#1b2633`: pinta a mistura com o branco embaixo.
    expect(comporSobre('#1b2633', '#ffffff', 0.6)).toBe('#767d85')
    expect(comporSobre('#000000', '#ffffff', 1)).toBe('#000000')
    expect(comporSobre('#000000', '#ffffff', 0)).toBe('#ffffff')
  })

  it('recusa entrada inválida em vez de devolver número sem sentido', () => {
    expect(() => converterHexParaRgb('#abc')).toThrow(/Cor inválida/)
    expect(() => converterHexParaRgb('vermelho')).toThrow(/Cor inválida/)
    expect(() => comporSobre('#000000', '#ffffff', 1.5)).toThrow(/Opacidade/)
  })
})

/**
 * Conformidade do design system (005, D3). Cada par abaixo é uma combinação que o produto
 * realmente pinta — descobrir que um par medido não existe na tela é motivo para tirá-lo daqui,
 * não para "corrigir" uma cor que ninguém vê.
 */
describe('WCAG 2.1 AA — pares de cor que o produto usa', () => {
  const TEXTO_SOBRE_BRANCO: ReadonlyArray<readonly [string, string]> = [
    ['ink', 'texto principal'],
    ['muted', 'texto secundário e terciário'],
    ['primary-medium', 'link'],
    ['primary', 'texto de marca'],
    ['error-texto', 'mensagem de erro'],
    ['success', 'confirmação'],
    ['primary-light', 'destaque'],
  ]

  it.each(TEXTO_SOBRE_BRANCO)('texto `%s` (%s) sobre branco atinge 4.5:1', (nome) => {
    expect(calcularContraste(token(nome), token('white'))).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO.textoNormal,
    )
  })

  const TEXTO_SOBRE_FAIXA: ReadonlyArray<readonly [string, string, string]> = [
    ['severidade-critico-texto', 'alert-error', 'comunicado crítico'],
    ['severidade-alerta-texto', 'alert-warning', 'comunicado de alerta'],
    ['ink', 'alert-info', 'faixa informativa'],
    ['primary-medium', 'alert-info', 'link na faixa informativa'],
    ['ink', 'alert-success', 'faixa de sucesso'],
    ['ink', 'surface-hover', 'bloco realçado'],
    ['ink', 'surface-disabled', 'campo desabilitado'],
    ['ink', 'highlight-anchor', 'linha destacada por âncora'],
    ['success', 'alert-success', 'rótulo da caixa de dica'],
    ['ink', 'alert-warning', 'corpo da caixa de atenção'],
    ['ink', 'alert-error', 'corpo da caixa importante'],
    ['primary-medium', 'alert-success', 'link na caixa de dica'],
    ['primary-medium', 'alert-warning', 'link na caixa de atenção'],
    ['primary-medium', 'alert-error', 'link na caixa importante'],
  ]

  it.each(TEXTO_SOBRE_FAIXA)('texto `%s` sobre `%s` (%s) atinge 4.5:1', (frente, fundo) => {
    expect(calcularContraste(token(frente), token(fundo))).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO.textoNormal,
    )
  })

  it('texto branco sobre o cabeçalho de destaque atinge 4.5:1', () => {
    expect(calcularContraste(token('white'), token('primary'))).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO.textoNormal,
    )
  })

  /**
   * 1.4.11 — o que identifica um controle, e não apenas decora. Borda de card e divisória ficam
   * de fora: são ornamento, e exigir 3:1 delas mudaria o produto onde não há problema de uso.
   */
  it('a borda que delimita um campo de formulário atinge 3:1', () => {
    expect(calcularContraste(token('border-control'), token('white'))).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO.naoTextual,
    )
  })

  it('o anel de foco atinge 3:1 — é o que diz onde o teclado está', () => {
    expect(calcularContraste(token('primary-light'), token('white'))).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO.naoTextual,
    )
  })

  it('o indicador de aba ativa atinge 3:1', () => {
    expect(calcularContraste(token('accent-hover'), token('white'))).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO.naoTextual,
    )
  })
})

/**
 * Guarda da decisão D1: opacidade sobre o texto principal produz uma cor que ninguém mediu.
 * Abaixo de 70% ela reprova em texto normal — e o produto usa `text-xs`/`text-sm` em todos esses
 * lugares. Este teste existe para que a tentação volte com um número, não com uma impressão.
 */
describe('opacidade sobre texto não substitui token', () => {
  it.each([
    [0.3, false],
    [0.4, false],
    [0.5, false],
    [0.6, false],
    [0.7, true],
    [0.8, true],
  ])('ink a %s de opacidade sobre branco: atinge AA? %s', (opacidade, deveAtingir) => {
    const composta = comporSobre(token('ink'), token('white'), opacidade)
    const atinge = calcularContraste(composta, token('white')) >= CONTRASTE_MINIMO.textoNormal

    expect(atinge).toBe(deveAtingir)
  })

  it('o token `muted` cobre o caso que a opacidade tentava resolver', () => {
    expect(calcularContraste(token('muted'), token('white'))).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO.textoNormal,
    )
  })
})
