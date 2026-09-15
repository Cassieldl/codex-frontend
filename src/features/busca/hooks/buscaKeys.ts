import { criarFabricaDeChaves } from '../../../utils/queryKeyFactory'

export interface ParametrosBusca {
  q: string
  provedor?: string
}

const base = criarFabricaDeChaves<ParametrosBusca>('busca')

export const buscaKeys = {
  ...base,
  resultado: (params: ParametrosBusca) => [...base.all, 'resultado', params] as const,
}
