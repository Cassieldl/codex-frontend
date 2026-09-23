import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ID_CONTEUDO_PRINCIPAL, PularParaConteudo } from './PularParaConteudo'

describe('PularParaConteudo (WCAG 2.4.1)', () => {
  it('aponta para o id do conteúdo principal', () => {
    render(<PularParaConteudo />)

    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute(
      'href',
      `#${ID_CONTEUDO_PRINCIPAL}`,
    )
  })

  /**
   * As duas classes andam em par. Só `sr-only` esconde o link para sempre — ele continua focável
   * e invisível, que é pior que não existir: o foco desaparece da tela sem explicação.
   */
  it('fica fora da vista até receber foco, e aparece quando focado', () => {
    render(<PularParaConteudo />)

    const pulo = screen.getByRole('link', { name: 'Pular para o conteúdo' })

    expect(pulo.className).toContain('sr-only')
    expect(pulo.className).toContain('focus:not-sr-only')
  })
})
