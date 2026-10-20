import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { focarPrimeiroCampoInvalido } from './focarPrimeiroCampoInvalido'

interface Valores {
  registrado: string
}

/**
 * Reproduz a forma dos formulários desta área: um campo PRÓPRIO no topo, controlado por fora do
 * `register` (todo `Select` daqui é assim), e um campo registrado logo abaixo. É essa ordem que
 * expõe o defeito — o React Hook Form só alcança o que tem `ref`, então pulava o de cima.
 */
function FormularioDeTeste() {
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<Valores>({ defaultValues: { registrado: '' } })

  return (
    <form onSubmit={handleSubmit(() => {}, focarPrimeiroCampoInvalido)} noValidate>
      {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props -- reproduz o select próprio, um botão marcado inválido */}
      <button type="button" aria-invalid="true" aria-label="Campo próprio, sem register">
        Selecione
      </button>

      <input
        aria-label="Campo registrado"
        aria-invalid={errors.registrado ? 'true' : undefined}
        {...register('registrado', { required: 'Obrigatório.' })}
      />

      <button type="submit">Salvar</button>
    </form>
  )
}

describe('focarPrimeiroCampoInvalido', () => {
  it('foca o campo inválido do topo, mesmo ele estando fora do register', async () => {
    render(<FormularioDeTeste />)

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Campo próprio, sem register' }),
      ),
    )
  })

  it('não mexe no foco quando o evento não vem de um formulário', () => {
    render(<FormularioDeTeste />)

    const antes = document.activeElement
    focarPrimeiroCampoInvalido({}, undefined)

    expect(document.activeElement).toBe(antes)
  })
})

/**
 * Guarda estrutural: o handler precisa estar em TODO formulário da área, senão o próximo nasce
 * pulando o primeiro erro — e o defeito não aparece em teste de tela nenhum, porque a validação
 * funciona e a mensagem aparece; só o foco vai para o lugar errado.
 */
describe('todo formulário da área interna leva o foco ao primeiro erro', () => {
  const FONTES = import.meta.glob('../**/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  })

  function formularios(): string[] {
    return Object.keys(FONTES).filter(
      (caminho) => !caminho.endsWith('.test.tsx') && FONTES[caminho].includes('handleSubmit('),
    )
  }

  it('a varredura enxerga os formulários', () => {
    // Sem contar o universo, um glob que parasse de casar deixaria o caso abaixo passar por vazio.
    expect(formularios().length).toBeGreaterThanOrEqual(10)
  })

  it('nenhum chama handleSubmit sem o tratamento de inválido', () => {
    const semTratamento = formularios().filter((caminho) =>
      /handleSubmit\(\s*\w+\s*\)/.test(FONTES[caminho]),
    )

    expect(semTratamento).toEqual([])
  })

  /**
   * O foco de erro do próprio RHF precisa estar DESLIGADO, senão os dois disputam o mesmo foco e o
   * vencedor muda com o agendamento.
   *
   * Foi assim que o primeiro conserto passou verde e continuou quebrado no navegador: em jsdom o
   * nosso `requestAnimationFrame` corria depois do RHF e ganhava; no Chrome, antes — e o RHF
   * sobrescrevia, levando o foco de volta ao segundo campo. Nenhum teste de comportamento pega
   * isso, porque a ordem dos dois é justamente o que difere entre os ambientes.
   */
  it('nenhum deixa o foco de erro do RHF ligado', () => {
    const comFocoDoRhf = formularios().filter(
      (caminho) => !FONTES[caminho].includes('shouldFocusError: false'),
    )

    expect(comFocoDoRhf).toEqual([])
  })
})
