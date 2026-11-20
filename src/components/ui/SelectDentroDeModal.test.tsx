import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'
import { Select } from './Select'

/**
 * O defeito não existe em nenhum dos dois componentes isolados - só na composição.
 * `Select` tratava `Escape` sem parar a propagação e `Modal` escuta `keydown` em `document`:
 * o mesmo Escape fechava a lista **e** o formulário inteiro, descartando o que já tinha sido
 * digitado. Os dois passavam nos próprios testes.
 *
 * Por isso este arquivo testa o par. Vale para qualquer popover efêmero dentro de um contêiner
 * que escute o teclado no documento.
 */
describe('Select dentro de Modal', () => {
  function FormularioComSelect({ aoFechar }: { aoFechar: () => void }) {
    const [valor, setValor] = useState('')

    return (
      <Modal isOpen title="Novo comunicado" onClose={aoFechar}>
        <form>
          <Select
            label="Severidade"
            value={valor}
            onValueChange={setValor}
            options={[
              { value: 'Critico', label: 'Crítico' },
              { value: 'Alerta', label: 'Alerta' },
            ]}
          />
        </form>
      </Modal>
    )
  }

  it('Escape com a lista aberta fecha só a lista, nunca o formulário', async () => {
    const usuario = userEvent.setup()
    const aoFechar = vi.fn()

    render(<FormularioComSelect aoFechar={aoFechar} />)

    await usuario.click(screen.getByRole('combobox', { name: /severidade/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(aoFechar).not.toHaveBeenCalled()
  })

  it('Escape com a lista já fechada fecha o formulário', async () => {
    const usuario = userEvent.setup()
    const aoFechar = vi.fn()

    render(<FormularioComSelect aoFechar={aoFechar} />)

    await usuario.keyboard('{Escape}')

    expect(aoFechar).toHaveBeenCalledTimes(1)
  })
})

/**
 * Item nomeado do checklist de acessibilidade (§12): ao fechar, o foco volta para o gatilho.
 * Estava marcado como verificado **por leitura do código** e não se sustentava ao ser exercitado:
 * `autoFocus` no conteúdo é aplicado por React na fase de commit, ANTES do efeito do `Modal`
 * guardar o elemento anterior - o que ficava guardado era um nó do próprio diálogo, e ao fechar o
 * foco caía no `body` sem erro nenhum.
 */
describe('Modal: devolução de foco ao gatilho', () => {
  function TelaComModal({ comAutoFocus }: { comAutoFocus: boolean }) {
    const [aberto, setAberto] = useState(false)

    return (
      <div>
        <button type="button" onClick={() => setAberto(true)}>
          Busca rápida
        </button>
        {aberto && (
          <Modal isOpen title="Busca rápida" onClose={() => setAberto(false)}>
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- o cenário testado é justamente o campo com autoFocus no modal */}
            <input aria-label="Termo" autoFocus={comAutoFocus} />
          </Modal>
        )}
      </div>
    )
  }

  it.each([
    [false, 'sem autoFocus no conteúdo'],
    [true, 'com autoFocus no conteúdo'],
  ])('devolve o foco ao gatilho (%s)', async (comAutoFocus) => {
    const usuario = userEvent.setup()
    render(<TelaComModal comAutoFocus={comAutoFocus} />)

    const gatilho = screen.getByRole('button', { name: 'Busca rápida' })
    await usuario.click(gatilho)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await usuario.keyboard('{Escape}')

    expect(document.activeElement).toBe(gatilho)
  })
})
