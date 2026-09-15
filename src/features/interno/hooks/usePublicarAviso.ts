import type { AvisoAdmin } from '../provedores/types/avisoAdmin'
import { criarUsePublicar } from './criarUsePublicar'

/**
 * `PUT /interno/avisos/{id}/publicacao` (I14d) — role `avisos-publicar`.
 * Aviso não tem query de detalhe própria (vive embutido em `ProvedorAdminDetalhe`/
 * `VersaoAdminDetalhe`) — a chave raiz aqui é só um namespace de invalidação;
 * quem chama também invalida a `detail` do provedor/versão pai (`escopo`),
 * já que é lá que a lista de avisos é renderizada.
 */
export const usePublicarAviso = criarUsePublicar<AvisoAdmin>(
  (id) => `/avisos/${id}/publicacao`,
  ['avisosAdmin'],
)
