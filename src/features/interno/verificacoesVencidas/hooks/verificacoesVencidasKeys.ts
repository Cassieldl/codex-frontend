import { criarFabricaDeChaves } from '../../../../utils/queryKeyFactory'

export interface ListarVerificacoesVencidasParams {
  dias: number
  pagina: number
  tamanhoPagina: number
}

export const verificacoesVencidasKeys =
  criarFabricaDeChaves<ListarVerificacoesVencidasParams>('verificacoesVencidas')
