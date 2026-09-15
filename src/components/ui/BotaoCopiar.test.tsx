import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BotaoCopiar } from './BotaoCopiar'

// `userEvent.setup()` já stuba `navigator.clipboard` (Clipboard própria, com
// `writeText`) para emular copiar/colar — sobrescrever a propriedade antes
// (`Object.defineProperty`) não sobrevive à chamada de `setup()`, que
// substitui `navigator.clipboard` de novo. Por isso espionamos o método já
// existente, sempre depois de `setup()`.
function configurarUsuarioComClipboard() {
  const usuario = userEvent.setup()
  const escreverNaAreaDeTransferencia = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue(undefined)
  return { usuario, escreverNaAreaDeTransferencia }
}

describe('BotaoCopiar', () => {
  it('copia o valor certo quando `valor` é string', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    render(
      <BotaoCopiar valor="RPS-2026-0001" ariaLabel="Copiar link do verbete RPS" rotulo="Copiar" />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Copiar link do verbete RPS' }))

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith('RPS-2026-0001')
  })

  it('copia o valor certo quando `valor` é função', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    const obterValor = () => 'https://codex.migrate.info/erros/rps-invalido'

    render(<BotaoCopiar valor={obterValor} ariaLabel="Copiar link do erro" rotulo="Copiar link" />)

    await usuario.click(screen.getByRole('button', { name: 'Copiar link do erro' }))

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith(
      'https://codex.migrate.info/erros/rps-invalido',
    )
  })

  it('usa o aria-label específico informado — nunca "Copiar" genérico', () => {
    render(<BotaoCopiar valor="x" ariaLabel="Copiar link do verbete RPS" rotulo="Copiar" />)

    expect(screen.getByRole('button', { name: 'Copiar link do verbete RPS' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copiar' })).not.toBeInTheDocument()
  })

  it('mostra o estado "copiado" após o clique e ele some depois de 2s', async () => {
    const { usuario } = configurarUsuarioComClipboard()
    render(<BotaoCopiar valor="x" ariaLabel="Copiar valor de teste" rotulo="Copiar" />)

    await usuario.click(screen.getByRole('button', { name: 'Copiar valor de teste' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Copiado')

    await waitFor(
      () => {
        expect(screen.getByRole('status')).toHaveTextContent('')
      },
      { timeout: 3000 },
    )
  }, 6000)
})
