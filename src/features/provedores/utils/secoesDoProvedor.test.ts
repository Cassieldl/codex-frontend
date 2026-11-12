import { describe, expect, it } from 'vitest'
import type { AvisoPublico } from '../types/provedor'
import type { VersaoProvedorPagina } from '../types/versaoProvedorPagina'
import { montarSecoesDoProvedor } from './secoesDoProvedor'

const AVISO_DE_VERSAO: AvisoPublico = {
  id: 1,
  escopo: 'versao',
  severidade: 'Alerta',
  titulo: 'Aviso',
  corpo: 'Corpo.',
  vigenciaInicio: '2026-09-01',
  camposAfetados: [],
}

function versao(parcial: Partial<VersaoProvedorPagina>): VersaoProvedorPagina {
  return {
    provedor: {
      slug: 'iss-net',
      nome: 'ISS.NET',
      categoria: 'Nacional',
      identificadorInvoicy: 'X',
    },
    versao: {
      slug: 'v1',
      rotulo: '1.01',
      verificadoEm: null,
      introducao: null,
      versaoLayoutRotulo: '8',
    },
    camposPorGrupo: [],
    totalCampos: 203,
    avisos: [],
    errosResumo: { total: 0, itens: [] },
    exemplos: [],
    naturezasOperacao: [],
    outrasVersoes: [],
    ...parcial,
  }
}

describe('montarSecoesDoProvedor', () => {
  it('deixa fora da barra as seções de lista vazia', () => {
    const secoes = montarSecoesDoProvedor(0, versao({}))

    expect(secoes.map((secao) => secao.rotulo)).toEqual(['Campos', 'Envio modelo'])
  })

  it('soma os avisos do provedor e os da versão, e conta os erros pelo total', () => {
    const secoes = montarSecoesDoProvedor(
      3,
      versao({
        avisos: [AVISO_DE_VERSAO],
        errosResumo: {
          total: 12,
          itens: [{ slug: 'e1', codigo: 'E1', titulo: 'Erro', variantes: [] }],
        },
      }),
    )

    expect(secoes.slice(0, 2)).toEqual([
      { id: 'avisos', rotulo: 'Avisos', contador: 4 },
      { id: 'erros-conhecidos', rotulo: 'Erros conhecidos', contador: 12 },
    ])
  })
})
