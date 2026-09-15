import { criarFabricaDeChaves } from '../../../../utils/queryKeyFactory'

export interface ListarErrosAdminParams {
  q?: string
  provedor?: string
  origem?: 'Prefeitura' | 'InvoiCy' | 'Schema'
  publicado?: boolean
  pagina?: number
  tamanhoPagina?: number
}

const base = criarFabricaDeChaves<ListarErrosAdminParams>('errosAdmin')

export const errosAdminKeys = {
  ...base,
}
