import { criarUsePublicar } from '../../hooks/criarUsePublicar'
import type { ComunicadoAdminDetalhe } from '../types/comunicadoAdmin'
import { comunicadosAdminKeys } from './comunicadosAdminKeys'

/**
 * `PUT /interno/comunicados/{id}/publicacao` (I35) - role `comunicados-publicar`.
 *
 * Publicar um comunicado **já expirado** responde `422 COMUNICADO_EXPIRADO`
 * (decisoes.md B-4) e o hook propaga o erro sem tratamento: quem decide a UX é
 * a página, que mostra a mensagem do backend (ela diz o próximo passo).
 * Despublicar é sempre permitido.
 */
export const usePublicarComunicado = criarUsePublicar<ComunicadoAdminDetalhe>(
  (id) => `/comunicados/${id}/publicacao`,
  comunicadosAdminKeys.all,
)
