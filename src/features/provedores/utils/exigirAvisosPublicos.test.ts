import { describe, expect, it } from 'vitest'
import type { AvisoPublico } from '../types/provedor'
import { exigirAvisosPublicos } from './exigirAvisosPublicos'

const avisoDeVersao: AvisoPublico = {
  id: 12,
  escopo: 'versao',
  severidade: 'Alerta',
  titulo: 'ISSRetido passou a ser obrigatório',
  corpo: 'Corpo.',
  vigenciaInicio: '2026-10-05',
  camposAfetados: [
    {
      campoLayoutSlug: 'servico-valores-issretido',
      nome: 'ISSRetido',
      caminhoXml: '//Servico/Valores/ISSRetido',
    },
  ],
}

// A forma antiga e a ausência chegam de fora do tipo; o cast só existe para montar esses casos.
function semCamposAfetados(valor: unknown): AvisoPublico {
  return { ...avisoDeVersao, camposAfetados: valor as AvisoPublico['camposAfetados'] }
}

describe('exigirAvisosPublicos', () => {
  it('devolve os avisos quando a forma está certa', () => {
    const avisos = [avisoDeVersao, { ...avisoDeVersao, id: 13, camposAfetados: [] }]

    expect(exigirAvisosPublicos(avisos)).toBe(avisos)
  })

  it('lista vazia de avisos é resultado legítimo, e não erro', () => {
    expect(exigirAvisosPublicos([])).toEqual([])
  })

  it('"avisos" ausente lança nomeando a coleção', () => {
    expect(() => exigirAvisosPublicos(undefined)).toThrow(/"avisos"/)
    expect(() => exigirAvisosPublicos(null)).toThrow(/"avisos"/)
  })

  it('"camposAfetados" ausente lança nomeando o campo e o aviso', () => {
    expect(() => exigirAvisosPublicos([semCamposAfetados(undefined)])).toThrow(
      /aviso 12.*"camposAfetados"/,
    )
  })

  it('"camposAfetados" na forma antiga (string[]) lança, em vez de render nomes indefinidos', () => {
    expect(() => exigirAvisosPublicos([semCamposAfetados(['ISSRetido'])])).toThrow(
      /"camposAfetados"/,
    )
  })

  it('um único aviso malformado entre vários basta para falhar', () => {
    const avisos = [avisoDeVersao, { ...semCamposAfetados(null), id: 99 }]

    expect(() => exigirAvisosPublicos(avisos)).toThrow(/aviso 99/)
  })
})
