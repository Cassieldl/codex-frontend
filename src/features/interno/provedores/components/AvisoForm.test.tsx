import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { OpcaoCampoAfetado } from './AvisoForm'
import { AvisoForm } from './AvisoForm'

const opcoesCampos: OpcaoCampoAfetado[] = [{ id: 1, rotulo: 'Número da RPS' }]

describe('AvisoForm', () => {
  it('com escopo="Provedor", não renderiza "campos afetados"', () => {
    render(
      <AvisoForm
        escopo="Provedor"
        opcoesCamposAfetados={opcoesCampos}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByText('Campos afetados')).not.toBeInTheDocument()
    expect(
      screen.getByText('Este aviso vale para o provedor inteiro, em qualquer versão.'),
    ).toBeInTheDocument()
  })

  it('com escopo="Versao", renderiza "campos afetados"', () => {
    render(
      <AvisoForm
        escopo="Versao"
        opcoesCamposAfetados={opcoesCampos}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText('Campos afetados')).toBeInTheDocument()
    expect(screen.getByText('Número da RPS')).toBeInTheDocument()
  })

  it('escopo="Provedor" nunca envia campoVersaoIds, mesmo que o estado interno os carregue', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn()
    render(<AvisoForm escopo="Provedor" onSubmit={onSubmit} onCancel={vi.fn()} />)

    await usuario.type(screen.getByLabelText(/título/i), 'Instabilidade temporária')
    await usuario.type(screen.getByLabelText(/corpo/i), 'A prefeitura está fora do ar hoje.')
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ campoVersaoIds: [] })
  })

  it('escopo="Versao" envia os ids marcados em campoVersaoIds', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <AvisoForm
        escopo="Versao"
        opcoesCamposAfetados={opcoesCampos}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await usuario.type(screen.getByLabelText(/título/i), 'Campo obrigatório mudou')
    await usuario.type(screen.getByLabelText(/corpo/i), 'A partir desta versão, X é obrigatório.')
    await usuario.click(screen.getByLabelText('Número da RPS'))
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ campoVersaoIds: [1] })
  })
})

// JSON literal transcrito de `AvisoAdminDto` (já com o `etag` derivado pelo hook de leitura).
const avisoGravado = {
  id: 12,
  escopo: 'Versao',
  severidade: 'Alerta',
  titulo: 'ISSRetido passou a ser obrigatório',
  corpo: 'Primeiro parágrafo.\n\nSegundo parágrafo.',
  vigenciaInicio: '2026-10-05',
  publicado: true,
  camposAfetadosIds: [2, 3],
  versaoConcorrencia: 9,
  etag: 'W/"9"',
} as const

const opcoesComTresCampos: OpcaoCampoAfetado[] = [
  { id: 1, rotulo: 'Número da RPS' },
  { id: 2, rotulo: 'ISSRetido' },
  { id: 3, rotulo: 'ValorIss' },
]

function renderizarEdicaoDeAvisoDeVersao(onSubmit = vi.fn()) {
  render(
    <AvisoForm
      escopo="Versao"
      initialData={{ ...avisoGravado, camposAfetadosIds: [...avisoGravado.camposAfetadosIds] }}
      opcoesCamposAfetados={opcoesComTresCampos}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  )
  return onSubmit
}

describe('AvisoForm — edição de aviso com campos afetados gravados', () => {
  it('pré-seleciona exatamente os campos já gravados', () => {
    renderizarEdicaoDeAvisoDeVersao()

    expect(screen.getByLabelText('Número da RPS')).not.toBeChecked()
    expect(screen.getByLabelText('ISSRetido')).toBeChecked()
    expect(screen.getByLabelText('ValorIss')).toBeChecked()
  })

  it('salvar sem tocar nos campos reenvia os ids gravados em campoVersaoIds', async () => {
    const usuario = userEvent.setup()
    const onSubmit = renderizarEdicaoDeAvisoDeVersao()

    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].campoVersaoIds).toEqual([2, 3])
  })

  it('desmarcar um campo gravado o tira de campoVersaoIds', async () => {
    const usuario = userEvent.setup()
    const onSubmit = renderizarEdicaoDeAvisoDeVersao()

    await usuario.click(screen.getByLabelText('ISSRetido'))
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].campoVersaoIds).toEqual([3])
  })

  it('aviso de provedor envia campoVersaoIds vazio ao editar, mesmo que o aviso traga ids', async () => {
    const usuario = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <AvisoForm
        escopo="Provedor"
        initialData={{ ...avisoGravado, escopo: 'Provedor', camposAfetadosIds: [2, 3] }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].campoVersaoIds).toEqual([])
  })
})
