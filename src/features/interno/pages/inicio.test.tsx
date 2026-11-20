import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Input } from '../../../components/ui/Input'

/**
 * A tela 11 é busca **ao vivo**: o erro chega enquanto o usuário ainda digita. Quando ela passou a
 * renderizar `ErrorState` no lugar da seção em branco, herdou o `autoFocus` do botão de retry - o
 * foco saltava para "Tentar novamente" e os caracteres seguintes se perdiam. Corrigir o estado
 * ausente introduziu um defeito pior que o estado ausente.
 *
 * Estes casos exercitam a forma da tela (campo de busca + bloco de erro) em vez da página inteira,
 * que exigiria router e sessão - o que importa aqui é a interação entre o campo e o erro.
 */
describe('Tela 11: o bloco de erro não pode roubar o foco da busca ao vivo', () => {
  function BuscaComErro() {
    const [termo, setTermo] = useState('')

    return (
      <div>
        <Input
          label="Buscar no Codex"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
        />
        {termo.length >= 3 && <ErrorState onRetry={vi.fn()} />}
      </div>
    )
  }

  it('o usuário continua digitando depois que o erro aparece', async () => {
    const usuario = userEvent.setup()
    render(<BuscaComErro />)

    const campo = screen.getByRole('textbox', { name: /buscar no codex/i })
    await usuario.click(campo)
    await usuario.keyboard('e0117')

    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await usuario.keyboard('-ipm')

    expect(campo).toHaveValue('e0117-ipm')
    expect(document.activeElement).toBe(campo)
  })

  it('o botão de tentar de novo continua alcançável por teclado', async () => {
    const usuario = userEvent.setup()
    const tentarDeNovo = vi.fn()

    render(
      <div>
        <ErrorState onRetry={tentarDeNovo} />
      </div>,
    )

    await usuario.tab()
    await usuario.keyboard('{Enter}')

    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
  })
})
