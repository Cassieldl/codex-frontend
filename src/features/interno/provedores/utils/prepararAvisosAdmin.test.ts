import { describe, expect, it } from 'vitest'
import type { AvisoAdmin } from '../types/avisoAdmin'
import { prepararAvisosAdmin } from './prepararAvisosAdmin'

const aviso: AvisoAdmin = {
  id: 12,
  escopo: 'Versao',
  severidade: 'Alerta',
  titulo: 'ISSRetido passou a ser obrigatório',
  corpo: 'Corpo.',
  vigenciaInicio: '2026-10-05',
  camposAfetadosIds: [31, 47],
  publicado: true,
  versaoConcorrencia: 9,
}

// A ausência chega de fora do tipo; o cast só existe para montar esse caso.
function semIds(): AvisoAdmin {
  return { ...aviso, camposAfetadosIds: undefined as unknown as number[] }
}

describe('prepararAvisosAdmin', () => {
  it('deriva o etag e mantém os ids dos campos afetados', () => {
    expect(prepararAvisosAdmin([aviso])).toEqual([{ ...aviso, etag: 'W/"9"' }])
  })

  it('aviso sem campos afetados ([]) é legítimo', () => {
    expect(prepararAvisosAdmin([{ ...aviso, camposAfetadosIds: [] }])[0].camposAfetadosIds).toEqual(
      [],
    )
  })

  it('"camposAfetadosIds" ausente lança nomeando o campo e o aviso', () => {
    expect(() => prepararAvisosAdmin([semIds()])).toThrow(/aviso 12.*"camposAfetadosIds"/)
  })

  it('"avisos" ausente lança nomeando a coleção', () => {
    expect(() => prepararAvisosAdmin(undefined)).toThrow(/"avisos"/)
  })
})
