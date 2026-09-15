import { versoesLayoutKeys } from '../camposLayout/hooks/versoesLayoutKeys'
import type { VersaoLayoutAdmin } from '../camposLayout/types/versaoLayoutAdmin'
import { criarUsePublicar } from './criarUsePublicar'

/** `PUT /interno/layout/versoes/{id}/publicacao` (I15d) — role `versoeslayout-publicar`. */
export const usePublicarVersaoLayout = criarUsePublicar<VersaoLayoutAdmin>(
  (id) => `/layout/versoes/${id}/publicacao`,
  versoesLayoutKeys.all,
)
