import { criarFabricaDeChaves } from '../../../../utils/queryKeyFactory'

export interface ListarProvedoresAdminParams {
  q?: string
  categoria?: 'Nacional' | 'Proprio'
  publicado?: boolean
  pagina?: number
  tamanhoPagina?: number
}

const base = criarFabricaDeChaves<ListarProvedoresAdminParams>('provedoresAdmin')

export const provedoresAdminKeys = {
  ...base,
  detail: (id: number) => [...base.all, 'detail', id] as const,
}
