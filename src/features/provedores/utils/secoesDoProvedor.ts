import type { SecaoDaBarra } from '../../../components/ui/BarraDeSecoes'
import { ID_SECAO_NATUREZA_OPERACAO } from '../components/NaturezasOperacao'
import type { VersaoProvedorPagina } from '../types/versaoProvedorPagina'
import { ID_AREA_AVISOS } from './avisoAncora'

export const ID_SECAO_ERROS_CONHECIDOS = 'erros-conhecidos'
export const ID_SECAO_CAMPOS = 'campos'
export const ID_SECAO_ENVIO_MODELO = 'envio-modelo'
export const ID_SECAO_EXEMPLOS = 'exemplos'

/**
 * Entradas da barra de seções da página do provedor, na ordem em que as seções aparecem. Seção que
 * não renderiza (lista vazia) fica fora: um link para o nada. Campos e Envio modelo sempre
 * renderizam, mesmo vazios, porque trazem o próprio estado de vazio.
 */
export function montarSecoesDoProvedor(
  totalAvisosDoProvedor: number,
  versao: VersaoProvedorPagina,
): SecaoDaBarra[] {
  const totalAvisos = totalAvisosDoProvedor + versao.avisos.length

  const secoes: (SecaoDaBarra | false)[] = [
    totalAvisos > 0 && { id: ID_AREA_AVISOS, rotulo: 'Avisos', contador: totalAvisos },
    versao.errosResumo.itens.length > 0 && {
      id: ID_SECAO_ERROS_CONHECIDOS,
      rotulo: 'Erros conhecidos',
      contador: versao.errosResumo.total,
    },
    { id: ID_SECAO_CAMPOS, rotulo: 'Campos', contador: versao.totalCampos },
    versao.naturezasOperacao.length > 0 && {
      id: ID_SECAO_NATUREZA_OPERACAO,
      rotulo: 'Natureza da operação',
      contador: versao.naturezasOperacao.length,
    },
    { id: ID_SECAO_ENVIO_MODELO, rotulo: 'Envio modelo' },
    versao.exemplos.length > 0 && {
      id: ID_SECAO_EXEMPLOS,
      rotulo: 'Exemplos',
      contador: versao.exemplos.length,
    },
  ]

  return secoes.filter((secao): secao is SecaoDaBarra => secao !== false)
}
