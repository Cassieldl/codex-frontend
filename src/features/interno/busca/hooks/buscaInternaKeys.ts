import { criarFabricaDeChaves } from '../../../../utils/queryKeyFactory'

export interface ParametrosBuscaInterna {
  q: string
  provedor?: string
}

const base = criarFabricaDeChaves<ParametrosBuscaInterna>('buscaInterna')

export const buscaInternaKeys = {
  ...base,
  resultado: (params: ParametrosBuscaInterna) => [...base.all, 'resultado', params] as const,
}
