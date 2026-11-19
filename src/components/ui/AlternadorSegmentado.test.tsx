import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AlternadorSegmentado } from './AlternadorSegmentado'

type Formato = 'xml' | 'json' | 'dicionario'

const FORMATOS: readonly Formato[] = ['dicionario', 'xml', 'json']
const ROTULO_DO_FORMATO: Record<Formato, string> = {
  dicionario: 'Dicionário',
  xml: 'XML',
  json: 'JSON',
}

function AlternadorComEstado({ inicial }: { inicial: Formato }) {
  const [formato, setFormato] = useState<Formato>(inicial)

  return (
    <AlternadorSegmentado
      rotulo="Formato"
      opcoes={FORMATOS}
      rotuloDaOpcao={ROTULO_DO_FORMATO}
      selecionada={formato}
      onSelecionar={setFormato}
    />
  )
}

describe('AlternadorSegmentado', () => {
  it('é um grupo de rádio com a opção escolhida marcada e só ela no Tab', () => {
    render(<AlternadorComEstado inicial="xml" />)

    expect(screen.getByRole('radiogroup', { name: 'Formato' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'XML' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'XML' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: 'JSON' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: 'JSON' })).toHaveAttribute('tabindex', '-1')
  })

  it('o clique escolhe a opção', async () => {
    const onSelecionar = vi.fn()
    render(
      <AlternadorSegmentado
        rotulo="Formato"
        opcoes={FORMATOS}
        rotuloDaOpcao={ROTULO_DO_FORMATO}
        selecionada="dicionario"
        onSelecionar={onSelecionar}
      />,
    )

    await userEvent.click(screen.getByRole('radio', { name: 'JSON' }))

    expect(onSelecionar).toHaveBeenCalledWith('json')
  })

  it('as setas trocam a escolha com volta nas pontas e levam o foco junto', async () => {
    render(<AlternadorComEstado inicial="json" />)

    await userEvent.click(screen.getByRole('radio', { name: 'JSON' }))
    await userEvent.keyboard('{ArrowRight}')

    const dicionario = screen.getByRole('radio', { name: 'Dicionário' })
    expect(dicionario).toHaveAttribute('aria-checked', 'true')
    expect(dicionario).toHaveFocus()

    await userEvent.keyboard('{ArrowLeft}')

    expect(screen.getByRole('radio', { name: 'JSON' })).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'JSON' })).toHaveAttribute('aria-checked', 'true')
  })
})
