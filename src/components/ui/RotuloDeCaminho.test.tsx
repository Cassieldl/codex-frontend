import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RotuloDeCaminho } from './RotuloDeCaminho'

describe('RotuloDeCaminho', () => {
  it('marca um ponto de quebra depois de cada barra', () => {
    const { container } = render(<RotuloDeCaminho texto="Servico/Valores/IBSCBS/TribRegular" />)

    expect(container.querySelectorAll('wbr')).toHaveLength(3)
  })

  it('não troca nenhum caractere: o texto continua sendo o caminho exato', () => {
    const { container } = render(<RotuloDeCaminho texto="Servico/Valores/IBSCBS/TribRegular" />)

    expect(container.textContent).toBe('Servico/Valores/IBSCBS/TribRegular')
  })

  it('rótulo sem barra fica como está, sem ponto de quebra', () => {
    const { container } = render(<RotuloDeCaminho texto="Tomador" />)

    expect(container.textContent).toBe('Tomador')
    expect(container.querySelectorAll('wbr')).toHaveLength(0)
  })
})
