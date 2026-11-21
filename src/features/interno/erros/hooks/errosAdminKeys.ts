import type { DirecaoDaOrdenacao } from '../../../../components/ui/ordenacaoDeTabela'
import { criarFabricaDeChaves } from '../../../../utils/queryKeyFactory'
import type { CampoDeOrdenacaoErro, OrigemErro } from '../types/erroAdmin'

export interface ListarErrosAdminParams {
  q?: string
  provedor?: string
  origem?: OrigemErro
  publicado?: boolean
  sortBy?: CampoDeOrdenacaoErro
  sortDirection?: DirecaoDaOrdenacao
  pagina?: number
  tamanhoPagina?: number
}

const base = criarFabricaDeChaves<ListarErrosAdminParams>('errosAdmin')

export const errosAdminKeys = {
  ...base,
  detail: (id: number) => [...base.all, 'detail', id] as const,
}
