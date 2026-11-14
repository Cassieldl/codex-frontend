import { describe, expect, it } from 'vitest'
import { ordenarAvisosPorGravidade, primeiraFraseDoAviso } from './resumoDoAviso'

describe('primeiraFraseDoAviso', () => {
  it('corta na primeira frase e tira a marcação do Markdown', () => {
    expect(
      primeiraFraseDoAviso(
        'Sem a **liberação** na [Nota Control](https://exemplo.com), o retorno é `E157`. Peça antes.',
      ),
    ).toBe('Sem a liberação na Nota Control, o retorno é E157.')
  })

  it('pula título, marcador de bloco e lista, e começa pelo primeiro texto de verdade', () => {
    const corpo =
      '## Antes de emitir\n\n> [!ATENCAO] Use só a série 8 em homologação. Outras falham.'

    expect(primeiraFraseDoAviso(corpo)).toBe('Use só a série 8 em homologação.')
  })

  it('não corta em ponto de versão, de e-mail nem de nome de tag', () => {
    const corpo =
      'Na versão 1.01, envie layout_version e escreva para suporte@nota.com.br antes. Depois teste.'

    expect(primeiraFraseDoAviso(corpo)).toBe(
      'Na versão 1.01, envie layout_version e escreva para suporte@nota.com.br antes.',
    )
  })

  it('sem ponto final, devolve o primeiro parágrafo inteiro', () => {
    expect(primeiraFraseDoAviso('Campos ainda em confirmação\ncom o InvoiCy\n\nOutro')).toBe(
      'Campos ainda em confirmação com o InvoiCy',
    )
  })
})

describe('ordenarAvisosPorGravidade', () => {
  it('põe crítico, atenção e informação nessa ordem e mantém a ordem recebida no empate', () => {
    const avisos = [
      { id: 1, severidade: 'Informativo' as const },
      { id: 2, severidade: 'Alerta' as const },
      { id: 3, severidade: 'Critico' as const },
      { id: 4, severidade: 'Alerta' as const },
      { id: 5, severidade: 'Informativo' as const },
    ]

    expect(ordenarAvisosPorGravidade(avisos).map((aviso) => aviso.id)).toEqual([3, 2, 4, 1, 5])
  })
})
