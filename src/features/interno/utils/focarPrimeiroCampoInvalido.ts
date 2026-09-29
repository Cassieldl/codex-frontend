import type { BaseSyntheticEvent } from 'react'

/**
 * Leva o foco ao primeiro campo inválido **na ordem da tela** quando o envio é recusado.
 *
 * O React Hook Form já move o foco sozinho, mas só alcança campo que passou por `register` — ele
 * precisa da `ref`. Todo select próprio desta área é controlado por `watch`/`setValue`, sem
 * `register`, e por isso é pulado: no formulário de campo, submeter vazio levava o foco para
 * "Tipo" enquanto o erro de "Campo canônico", logo acima, ficava para trás. Quem navega por
 * teclado corrige o que o foco mostrou, envia de novo e o formulário recusa sem dizer por quê.
 *
 * A varredura é por `aria-invalid="true"` no DOM, não pela lista de erros do formulário: assim a
 * ordem é a que a pessoa enxerga, e campo próprio conta igual a campo registrado.
 *
 * Roda depois do quadro seguinte porque os `aria-invalid` só existem depois que o React pinta o
 * resultado da validação — e, de quebra, isso o põe atrás do foco que o próprio RHF acabou de dar.
 */
export function focarPrimeiroCampoInvalido(_erros: unknown, evento?: BaseSyntheticEvent): void {
  const formulario = evento?.target

  if (!(formulario instanceof HTMLFormElement)) return

  requestAnimationFrame(() => {
    const primeiroInvalido = formulario.querySelector('[aria-invalid="true"]')

    if (primeiroInvalido instanceof HTMLElement) primeiroInvalido.focus()
  })
}
