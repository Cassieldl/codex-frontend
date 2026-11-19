import { describe, expect, it } from 'vitest'
import { ordenarAvisosPorGravidade } from './resumoDoAviso'

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
