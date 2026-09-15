import { describe, expect, it } from 'vitest'
import { provedoresSearchSchema } from './index'

// PQ-10 — mesma correção de `busca.tsx`, ver `routes/busca.test.ts`.
describe('provedoresSearchSchema — PQ-10', () => {
  it('preserva "origem" ao validar um search com os demais campos', () => {
    const resultado = provedoresSearchSchema.parse({
      categoria: 'Nacional',
      pagina: 2,
      origem: 'atendimento',
    })

    expect(resultado.origem).toBe('atendimento')
  })

  it('"origem" continua opcional — search sem ele não quebra', () => {
    const resultado = provedoresSearchSchema.parse({ pagina: 1 })

    expect(resultado.origem).toBeUndefined()
  })
})
