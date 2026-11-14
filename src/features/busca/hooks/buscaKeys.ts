import { criarFabricaDeChaves } from '../../../utils/queryKeyFactory'
import type { TipoResultado } from '../types/resultadoBusca'

export interface ParametrosBusca {
  q: string
  provedor?: string
}

const base = criarFabricaDeChaves<ParametrosBusca>('busca')

export interface ParametrosPaginaDoGrupo extends ParametrosBusca {
  tipo: TipoResultado
  pagina: number
  tamanhoPagina: number
}

export const buscaKeys = {
  ...base,
  resultado: (params: ParametrosBusca) => [...base.all, 'resultado', params] as const,
  paginaDoGrupo: (params: ParametrosPaginaDoGrupo) =>
    [...base.all, 'pagina-do-grupo', params] as const,
}
