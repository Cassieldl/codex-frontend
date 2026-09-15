import { criarUsePublicar } from '../../hooks/criarUsePublicar'
import type { ArtigoAdminDetalhe } from '../types/artigoAdmin'
import { artigosAdminKeys } from './artigosAdminKeys'

/**
 * `PUT /interno/artigos/{id}/publicacao` (I28) — role `artigos-publicar`.
 *
 * **Publicar é sempre permitido, inclusive o artigo reservado** — publicar
 * nunca quebra link. Despublicar o reservado é que responde
 * `422 ARTIGO_RESERVADO`, porque derrubaria a rota `/como-funciona`, que o
 * cabeçalho público exibe incondicionalmente.
 */
export const usePublicarArtigo = criarUsePublicar<ArtigoAdminDetalhe>(
  (id) => `/artigos/${id}/publicacao`,
  artigosAdminKeys.all,
)
