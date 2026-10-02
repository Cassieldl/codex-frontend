import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrechosDestacados } from './TrechosDestacados'

describe('TrechosDestacados', () => {
  it('envolve em <mark> só os trechos marcados como destacado', () => {
    render(
      <TrechosDestacados
        trechos={[
          { texto: 'código ', destacado: false },
          { texto: 'E0117', destacado: true },
          { texto: ' não encontrado', destacado: false },
        ]}
      />,
    )

    const destaque = screen.getByText('E0117')
    expect(destaque.tagName).toBe('MARK')
    expect(screen.getByText('não encontrado', { exact: false }).closest('mark')).toBeNull()
  })

  it('nunca interpreta o texto do trecho como HTML (sem dangerouslySetInnerHTML)', () => {
    render(
      <TrechosDestacados trechos={[{ texto: '<strong>injetado</strong>', destacado: false }]} />,
    )

    // Se fosse dangerouslySetInnerHTML, <strong> viraria elemento real e o
    // texto visível seria só "injetado". Renderização segura mostra o texto
    // literal, tags incluídas.
    expect(screen.getByText('<strong>injetado</strong>')).toBeInTheDocument()
    expect(screen.queryByText('injetado')).not.toBeInTheDocument()
  })

  /**
   * O util tem teste próprio, mas ele não prova que ESTE componente o chama — a função poderia
   * existir, estar correta e nunca ser usada, e a tela seguiria mostrando `##` e `**`.
   */
  it('não deixa a marcação Markdown chegar à tela', () => {
    render(
      <TrechosDestacados
        trechos={[
          { texto: 'não é ## Vocabulário: define **', destacado: false },
          { texto: 'nome', destacado: true },
          { texto: '** de cada campo', destacado: false },
        ]}
      />,
    )

    expect(screen.getByText('nome').tagName).toBe('MARK')
    expect(screen.queryByText(/##|\*\*/)).not.toBeInTheDocument()
    expect(screen.getByText(/Vocabulário: define/)).toBeInTheDocument()
  })

  it('renderiza uma lista vazia sem erro', () => {
    const { container } = render(<TrechosDestacados trechos={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
