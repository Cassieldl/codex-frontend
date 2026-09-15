import { criarFabricaDeChaves } from '../../../../utils/queryKeyFactory'

export interface ListarVersoesLayoutParams {
  pagina?: number
  tamanhoPagina?: number
}

const base = criarFabricaDeChaves<ListarVersoesLayoutParams>('versoesLayoutAdmin')

export const versoesLayoutKeys = {
  ...base,
}
