import { describe, expect, it } from 'vitest'
import { errosSearchSchema } from './index'

// PQ-10 — mesma correção de `busca.tsx`, ver `routes/busca.test.ts`.
describe('errosSearchSchema — PQ-10', () => {
  it('preserva "origem" ao validar um search com os demais campos', () => {
    const resultado = errosSearchSchema.parse({ codigo: 'e0117', origem: 'atendimento' })

    expect(resultado.origem).toBe('atendimento')
  })

  it('"origem" continua opcional — search sem ele não quebra', () => {
    const resultado = errosSearchSchema.parse({ codigo: 'e0117' })

    expect(resultado.origem).toBeUndefined()
  })
})
