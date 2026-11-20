import { versoesAdminKeys } from '../provedores/hooks/versoesAdminKeys'
import type { VersaoAdminDetalhe } from '../provedores/types/versaoAdmin'
import { criarUsePublicar } from './criarUsePublicar'

/** `PUT /interno/versoes/{id}/publicacao` (I9) - role `versoesprovedor-publicar`. */
export const usePublicarVersaoProvedor = criarUsePublicar<VersaoAdminDetalhe>(
  (id) => `/versoes/${id}/publicacao`,
  versoesAdminKeys.all,
)
