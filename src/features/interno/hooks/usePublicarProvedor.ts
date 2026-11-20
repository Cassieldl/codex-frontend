import { provedoresAdminKeys } from '../provedores/hooks/provedoresAdminKeys'
import type { ProvedorAdminDetalhe } from '../provedores/types/provedorAdmin'
import { criarUsePublicar } from './criarUsePublicar'

/** `PUT /interno/provedores/{id}/publicacao` (I3b, M19) - role `provedores-publicar`. */
export const usePublicarProvedor = criarUsePublicar<ProvedorAdminDetalhe>(
  (id) => `/provedores/${id}/publicacao`,
  provedoresAdminKeys.all,
)
