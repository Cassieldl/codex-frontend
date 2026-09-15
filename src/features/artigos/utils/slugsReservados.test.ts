import { describe, expect, it } from 'vitest'
import { SLUG_COMO_FUNCIONA } from './slugsReservados'

describe('slugsReservados', () => {
  // Amarra manual entre os dois repositórios: este valor precisa ser idêntico a
  // `Codex.Domain/Constantes/SlugsReservadosArtigo.ComoFunciona` no
  // `codex-backend`. Se este teste cair, o arquivo do backend a mudar junto é
  // `src/Codex.Domain/Constantes/SlugsReservadosArtigo.cs` — mudar só um lado
  // faz `/como-funciona` devolver 404 sem nenhum erro de compilação.
  it('trava a literal do slug reservado de "Como funciona"', () => {
    expect(SLUG_COMO_FUNCIONA).toBe('como-funciona')
  })
})
