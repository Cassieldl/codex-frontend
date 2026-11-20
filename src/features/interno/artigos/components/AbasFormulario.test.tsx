import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { AbasFormulario } from './AbasFormulario'

function AbasDeTeste() {
  const [ativo, setAtivo] = useState('editar')

  return (
    <AbasFormulario
      ariaLabel="Corpo do artigo"
      valorAtivo={ativo}
      onValorAtivoChange={setAtivo}
      abas={[
        { valor: 'editar', rotulo: 'Editar', conteudo: <p>painel de edição</p> },
        { valor: 'pre-visualizar', rotulo: 'Pré-visualizar', conteudo: <p>painel de preview</p> },
        { valor: 'ajuda', rotulo: 'Ajuda', conteudo: <p>painel de ajuda</p> },
      ]}
    />
  )
}

describe('AbasFormulario: ARIA Tabs Pattern', () => {
  it('exatamente uma aba fica selecionada e tabulável por vez', async () => {
    const usuario = userEvent.setup()
    render(<AbasDeTeste />)

    const abas = screen.getAllByRole('tab')
    expect(abas.filter((aba) => aba.getAttribute('aria-selected') === 'true')).toHaveLength(1)
    expect(abas.filter((aba) => aba.getAttribute('tabindex') === '0')).toHaveLength(1)

    await usuario.click(screen.getByRole('tab', { name: 'Pré-visualizar' }))

    const depois = screen.getAllByRole('tab')
    expect(depois.filter((aba) => aba.getAttribute('aria-selected') === 'true')).toHaveLength(1)
    expect(screen.getByRole('tab', { name: 'Pré-visualizar' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Editar' })).toHaveAttribute('aria-selected', 'false')
  })

  it('setas circulam entre as três abas e Home/End vão aos extremos', async () => {
    const usuario = userEvent.setup()
    render(<AbasDeTeste />)

    const editar = screen.getByRole('tab', { name: 'Editar' })
    editar.focus()

    // Três abas e uma ordem esperada que não coincide nem com a de inserção
    // nem com o inverso dela: Editar → Pré-visualizar → Ajuda → Editar.
    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Pré-visualizar' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Ajuda' })).toHaveAttribute('aria-selected', 'true')

    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Editar' })).toHaveAttribute('aria-selected', 'true')

    await usuario.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Ajuda' })).toHaveAttribute('aria-selected', 'true')

    await usuario.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Editar' })).toHaveAttribute('aria-selected', 'true')

    await usuario.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Ajuda' })).toHaveAttribute('aria-selected', 'true')
  })

  it('só o painel da aba ativa é exibido, mas os demais seguem montados', async () => {
    const usuario = userEvent.setup()
    render(<AbasDeTeste />)

    expect(screen.getByText('painel de edição')).toBeVisible()
    expect(screen.getByText('painel de preview')).not.toBeVisible()

    await usuario.click(screen.getByRole('tab', { name: 'Pré-visualizar' }))

    // O painel de edição continua no DOM: o que foi digitado no textarea não
    // pode sumir porque o editor espiou a pré-visualização.
    expect(screen.getByText('painel de edição')).toBeInTheDocument()
    expect(screen.getByText('painel de edição')).not.toBeVisible()
    expect(screen.getByText('painel de preview')).toBeVisible()
  })

  it('cada tab aponta para o painel que rotula (aria-controls ↔ aria-labelledby)', () => {
    render(<AbasDeTeste />)

    for (const aba of screen.getAllByRole('tab')) {
      const idDoPainel = aba.getAttribute('aria-controls')
      expect(idDoPainel).toBeTruthy()
      const painel = document.getElementById(idDoPainel as string)
      expect(painel).not.toBeNull()
      expect(painel).toHaveAttribute('aria-labelledby', aba.id)
    }
  })
})
