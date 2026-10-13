import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IndiceDeBlocos } from './IndiceDeBlocos'

/** Raízes fora de ordem alfabética, com contagem 3, 0 e 1 (plural, zero e singular). */
const ENTRADAS = [
  { raiz: 'Servico', rotulo: 'Serviço', quantidadeVisivel: 3 },
  { raiz: 'Tomador', rotulo: 'Tomador', quantidadeVisivel: 0 },
  { raiz: 'Prestador', rotulo: 'Prestador', quantidadeVisivel: 1 },
]

afterEach(() => {
  window.location.hash = ''
})

describe('IndiceDeBlocos', () => {
  it('lista rótulo e contagem de cada bloco, na ordem recebida', () => {
    render(<IndiceDeBlocos entradas={ENTRADAS} onIrParaBloco={() => {}} />)

    const itens = screen.getAllByRole('listitem')

    expect(itens.map((item) => item.textContent)).toEqual([
      'Serviço 3 campos',
      'Tomador 0 campos',
      'Prestador 1 campo',
    ])
  })

  it('nomeia a navegação e a contagem para o leitor de tela', () => {
    render(<IndiceDeBlocos entradas={ENTRADAS} onIrParaBloco={() => {}} />)

    const navegacao = screen.getByRole('navigation', { name: 'Blocos do layout' })

    expect(navegacao).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Serviço 3 campos' })).toHaveAttribute(
      'href',
      '#bloco-Servico',
    )
    expect(screen.getByRole('link', { name: 'Prestador 1 campo' })).toHaveAttribute(
      'href',
      '#bloco-Prestador',
    )
  })

  it('não faz link do bloco com 0 campos, que continua à vista como texto', () => {
    render(<IndiceDeBlocos entradas={ENTRADAS} onIrParaBloco={() => {}} />)

    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: /Tomador/ })).toBeNull()
    expect(screen.getByText('Tomador')).toBeInTheDocument()
  })

  it('clicar no texto do bloco com 0 campos não leva a lugar nenhum', () => {
    const irParaBloco = vi.fn()
    render(<IndiceDeBlocos entradas={ENTRADAS} onIrParaBloco={irParaBloco} />)

    fireEvent.click(screen.getByText('Tomador'))

    expect(irParaBloco).not.toHaveBeenCalled()
  })

  it('clicar no link pede o bloco certo uma vez, sem mudar o hash da URL', () => {
    const irParaBloco = vi.fn()
    render(<IndiceDeBlocos entradas={ENTRADAS} onIrParaBloco={irParaBloco} />)

    const naoCancelado = fireEvent.click(screen.getByRole('link', { name: 'Serviço 3 campos' }))

    expect(naoCancelado).toBe(false)
    expect(window.location.hash).toBe('')
    expect(irParaBloco).toHaveBeenCalledExactlyOnceWith('Servico')
  })
})
