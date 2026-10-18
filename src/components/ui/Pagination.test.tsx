import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('desabilita "Página anterior" na primeira página', () => {
    render(
      <Pagination
        page={1}
        pageSize={25}
        totalCount={100}
        totalPages={4}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeEnabled()
  })

  it('desabilita "Próxima página" na última página', () => {
    render(
      <Pagination
        page={4}
        pageSize={25}
        totalCount={100}
        totalPages={4}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled()
  })

  it('chama onPageChange com a página correta ao clicar em "Próxima página"', async () => {
    const usuario = userEvent.setup()
    const aoMudarPagina = vi.fn()

    render(
      <Pagination
        page={2}
        pageSize={25}
        totalCount={100}
        totalPages={4}
        onPageChange={aoMudarPagina}
        onPageSizeChange={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Próxima página' }))

    expect(aoMudarPagina).toHaveBeenCalledWith(3)
  })

  it('chama onPageChange com a página correta ao clicar em "Página anterior"', async () => {
    const usuario = userEvent.setup()
    const aoMudarPagina = vi.fn()

    render(
      <Pagination
        page={2}
        pageSize={25}
        totalCount={100}
        totalPages={4}
        onPageChange={aoMudarPagina}
        onPageSizeChange={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Página anterior' }))

    expect(aoMudarPagina).toHaveBeenCalledWith(1)
  })

  it('chama onPageChange ao clicar diretamente em um número de página', async () => {
    const usuario = userEvent.setup()
    const aoMudarPagina = vi.fn()

    render(
      <Pagination
        page={1}
        pageSize={25}
        totalCount={100}
        totalPages={4}
        onPageChange={aoMudarPagina}
        onPageSizeChange={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Página 3' }))

    expect(aoMudarPagina).toHaveBeenCalledWith(3)
  })

  it('marca aria-current="page" só na página atual', () => {
    render(
      <Pagination
        page={2}
        pageSize={25}
        totalCount={100}
        totalPages={4}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Página 1' })).not.toHaveAttribute('aria-current')
  })

  it('chama onPageSizeChange com o valor numérico ao trocar o tamanho de página', async () => {
    const usuario = userEvent.setup()
    const aoMudarTamanho = vi.fn()

    render(
      <Pagination
        page={1}
        pageSize={25}
        totalCount={100}
        totalPages={4}
        pageSizeOptions={[25, 50, 100, 200]}
        onPageChange={vi.fn()}
        onPageSizeChange={aoMudarTamanho}
      />,
    )

    await usuario.selectOptions(screen.getByLabelText('Itens por página'), '50')

    expect(aoMudarTamanho).toHaveBeenCalledWith(50)
  })

  it('exibe o total de registros', () => {
    render(
      <Pagination
        page={1}
        pageSize={25}
        totalCount={137}
        totalPages={6}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )

    expect(screen.getByText('137 registros')).toBeInTheDocument()
  })

  it('o seletor de itens por página usa a borda de controle (3:1), não a decorativa', () => {
    render(
      <Pagination
        page={1}
        pageSize={25}
        totalCount={137}
        totalPages={6}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )

    const classes = screen.getByLabelText('Itens por página').className.split(/\s+/)
    expect(classes).toContain('border-border-control')
    expect(classes).not.toContain('border-border')
  })
})
