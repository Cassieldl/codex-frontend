import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BlocoMensagensObservadas } from './BlocoMensagensObservadas'

// Mesmo padrão de `BotaoCopiar.test.tsx`: `userEvent.setup()` já stuba
// `navigator.clipboard`, então espionamos o método existente depois do setup.
function configurarUsuarioComClipboard() {
  const usuario = userEvent.setup()
  const escreverNaAreaDeTransferencia = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue(undefined)
  return { usuario, escreverNaAreaDeTransferencia }
}

describe('BlocoMensagensObservadas', () => {
  it('gera um aria-label específico e único por variante - nunca "Copiar" genérico', () => {
    render(
      <BlocoMensagensObservadas
        codigoErro="E0117"
        titulo="CNPJ do tomador inválido"
        variantes={['CNPJ inválido para o tomador informado.', 'Documento do tomador inválido.']}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Copiar mensagem observada 1 do erro E0117' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Copiar mensagem observada 2 do erro E0117' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copiar' })).not.toBeInTheDocument()
  })

  it('cada item tem um id de DOM único (AP-FRONTEND-003)', () => {
    const { container } = render(
      <BlocoMensagensObservadas
        codigoErro="E0117"
        titulo="CNPJ do tomador inválido"
        variantes={['Mensagem A', 'Mensagem B']}
      />,
    )

    const ids = Array.from(container.querySelectorAll('li')).map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('copia o texto exato da variante clicada', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    render(
      <BlocoMensagensObservadas
        codigoErro="E0117"
        titulo="CNPJ do tomador inválido"
        variantes={['CNPJ inválido para o tomador informado.']}
      />,
    )

    await usuario.click(
      screen.getByRole('button', { name: 'Copiar mensagem observada 1 do erro E0117' }),
    )

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith(
      'CNPJ inválido para o tomador informado.',
    )
  })
})

describe('BlocoMensagensObservadas: a mensagem do cabeçalho não se repete', () => {
  it('tira a variante igual ao título e mantém as que dizem outra coisa', () => {
    render(
      <BlocoMensagensObservadas
        codigoErro="E0157"
        titulo="Usuário não tem autorização para solicitar o serviço."
        variantes={[
          'Usuário não tem autorização para solicitar o serviço',
          'Contribuinte sem liberação na prefeitura.',
        ]}
      />,
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Contribuinte sem liberação na prefeitura.')).toBeInTheDocument()
  })

  it('sem variante além do título, a seção não aparece', () => {
    const { container } = render(
      <BlocoMensagensObservadas
        codigoErro="E0157"
        titulo="Usuário não tem autorização para solicitar o serviço."
        variantes={['Usuário não tem autorização para solicitar o serviço.']}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
