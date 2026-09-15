import { describe, expect, it } from 'vitest'
import { buscaSearchSchema } from './busca'

// PQ-10: sem `origem` no schema, `validateSearch` (modo "strip" do Zod)
// descartava o parâmetro da URL a cada navegação — link copiado pela barra
// de comando (§9.3) chegava sem a marca de origem.
describe('buscaSearchSchema — PQ-10', () => {
  it('preserva "origem" ao validar um search com os demais campos', () => {
    const resultado = buscaSearchSchema.parse({
      q: 'e0117',
      provedor: 'ipm',
      origem: 'atendimento',
    })

    expect(resultado.origem).toBe('atendimento')
  })

  it('"origem" continua opcional — search sem ele não quebra', () => {
    const resultado = buscaSearchSchema.parse({ q: 'e0117' })

    expect(resultado.origem).toBeUndefined()
  })
})
