import { criarFabricaDeChaves } from '../../../utils/queryKeyFactory'

export interface ParametrosListaErros {
  codigo: string
}

const base = criarFabricaDeChaves<ParametrosListaErros>('erros')

export const errosKeys = {
  ...base,
  detail: (slug: string) => [...base.all, 'detail', slug] as const,
}
