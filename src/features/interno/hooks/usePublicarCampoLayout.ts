import { camposLayoutKeys } from '../camposLayout/hooks/camposLayoutKeys'
import type { CampoLayoutAdmin } from '../camposLayout/types/campoLayoutAdmin'
import { criarUsePublicar } from './criarUsePublicar'

/** `PUT /interno/campos-layout/{id}/publicacao` (I17c) - role `campolayout-publicar`. */
export const usePublicarCampoLayout = criarUsePublicar<CampoLayoutAdmin>(
  (id) => `/campos-layout/${id}/publicacao`,
  camposLayoutKeys.all,
)
