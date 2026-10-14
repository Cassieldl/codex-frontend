import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PainelCaminhoInvoicy } from './PainelCaminhoInvoicy'

describe('PainelCaminhoInvoicy', () => {
  it('copia o caminho do campo, com o nome do campo no rótulo acessível', async () => {
    const usuario = userEvent.setup()
    const escreverNaAreaDeTransferencia = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)
    render(
      <PainelCaminhoInvoicy
        titulo="No InvoiCy"
        nomeDoCampo="PaiPreServico"
        caminhoXml="//Servico/PaiPreServico"
      />,
    )

    await usuario.click(
      screen.getByRole('button', { name: 'Copiar caminho do campo PaiPreServico no InvoiCy' }),
    )

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith('//Servico/PaiPreServico')
  })

  it('o título vem da prop e nomeia a seção', () => {
    render(
      <PainelCaminhoInvoicy
        titulo="No Layout InvoiCy"
        nomeDoCampo="PaiPreServico"
        caminhoXml="//Servico/PaiPreServico"
      />,
    )

    expect(screen.getByRole('region', { name: 'No Layout InvoiCy' })).toBeInTheDocument()
    expect(screen.queryByText('No InvoiCy')).toBeNull()
  })

  it('mostra o caminho em destaque dentro do painel', () => {
    render(
      <PainelCaminhoInvoicy
        titulo="No InvoiCy"
        nomeDoCampo="PaiPreServico"
        caminhoXml="//Servico/PaiPreServico"
      />,
    )

    const painel = screen.getByRole('region', { name: 'No InvoiCy' })

    expect(painel).toHaveTextContent('Servico')
    expect(painel).toHaveTextContent('PaiPreServico')
  })
})
