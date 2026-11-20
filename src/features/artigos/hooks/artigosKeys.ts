import { criarFabricaDeChaves } from '../../../utils/queryKeyFactory'
import type { TipoArtigo } from '../types/artigo'

export interface ListarArtigosParams {
  q?: string
  /** Filtro de uma aba do índice (§2.1) - o backend aceita repetível, a UI usa um por vez. */
  tipo?: TipoArtigo
  pagina?: number
  tamanhoPagina?: number
}

const base = criarFabricaDeChaves<ListarArtigosParams>('artigos')

export const artigosKeys = {
  ...base,
  // P8: página do artigo. A rota fixa `/como-funciona` usa a mesma chave do
  // slug reservado, então as duas entradas compartilham cache em vez de
  // refazer o fetch ao trocar de endereço canônico.
  detail: (slug: string) => [...base.all, 'detail', slug] as const,
}
