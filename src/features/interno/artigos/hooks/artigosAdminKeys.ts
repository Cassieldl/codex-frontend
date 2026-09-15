import { criarFabricaDeChaves } from '../../../../utils/queryKeyFactory'
import type { TipoArtigo } from '../types/artigoAdmin'

export interface ListarArtigosAdminParams {
  q?: string
  tipo?: TipoArtigo
  /** Filtro por estado de publicação (I23) — ausente traz rascunho e publicado. */
  publicado?: boolean
  pagina?: number
  tamanhoPagina?: number
}

const base = criarFabricaDeChaves<ListarArtigosAdminParams>('artigosAdmin')

export const artigosAdminKeys = {
  ...base,
  detail: (id: number) => [...base.all, 'detail', id] as const,
  /** I36 — existência por slug, chave própria: não é nem lista nem detalhe por id. */
  existe: (slug: string) => [...base.all, 'existe', slug] as const,
}
