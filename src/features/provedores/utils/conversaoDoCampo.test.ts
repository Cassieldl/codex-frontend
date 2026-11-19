import { describe, expect, it } from 'vitest'
import type { NaturezaOperacaoPublica } from '../types/versaoProvedorPagina'
import { conversaoDoCampo, exemploNoProvedor } from './conversaoDoCampo'

function natureza(
  codigoInvoicy: number,
  valorProvedor: string,
  descricao: string,
): NaturezaOperacaoPublica {
  return { codigoInvoicy, valorProvedor, descricao, observacao: null, aConfirmar: false }
}

/** 1 chega como 1 (sem conversão); 4 e 7 mudam de código no caminho. */
const NATUREZAS = [
  natureza(1, '1', 'Tributação no município'),
  natureza(4, '2', 'Imunidade'),
  natureza(7, '3', 'Exportação'),
]

const NAT_OP = { caminhoXml: '//natOp', exemplo: '7' }

describe('conversaoDoCampo', () => {
  it('no natOp, ilustra a conversão com o exemplo do próprio campo', () => {
    expect(conversaoDoCampo(NAT_OP, NATUREZAS)).toEqual({
      valorEnviado: '7',
      valorRecebido: '3',
      descricao: 'Exportação',
      aConfirmar: false,
    })
  })

  it('se o exemplo não converte ou falta, usa o primeiro código da tabela que converte', () => {
    expect(conversaoDoCampo({ ...NAT_OP, exemplo: '1' }, NATUREZAS)?.valorEnviado).toBe('4')
    expect(conversaoDoCampo({ ...NAT_OP, exemplo: null }, NATUREZAS)?.valorEnviado).toBe('4')
  })

  it('sem conversão nenhuma não há bloco: campo comum, tabela vazia ou de-para idêntico', () => {
    expect(conversaoDoCampo({ caminhoXml: '//RPSSerie', exemplo: '4' }, NATUREZAS)).toBeNull()
    expect(conversaoDoCampo(NAT_OP, [])).toBeNull()
    expect(conversaoDoCampo(NAT_OP, [natureza(1, '1', 'Tributação no município')])).toBeNull()
  })
})

describe('exemploNoProvedor', () => {
  it('o XML do provedor recebe o valor convertido, nunca o código do InvoiCy', () => {
    expect(exemploNoProvedor(NAT_OP, NATUREZAS)).toBe('3')
    expect(exemploNoProvedor({ ...NAT_OP, exemplo: '9' }, NATUREZAS)).toBeNull()
  })

  it('campo sem de-para mantém o próprio exemplo', () => {
    expect(exemploNoProvedor({ caminhoXml: '//RPSSerie', exemplo: '4' }, NATUREZAS)).toBe('4')
    expect(exemploNoProvedor(NAT_OP, [])).toBe('7')
  })
})
