import type { EstadoLacunaBusca, OrdenacaoTermoLacunaBusca } from '../types/lacunaBusca'

export interface ListarTermosLacunaBuscaParams {
  estado?: EstadoLacunaBusca
  sortBy?: OrdenacaoTermoLacunaBusca
  sortDirection?: 'asc' | 'desc'
  pagina?: number
  tamanhoPagina?: number
}

const all = ['lacunasBusca'] as const

export const lacunasBuscaKeys = {
  all,
  termos: (params: ListarTermosLacunaBuscaParams) => [...all, 'termos', params] as const,
}
