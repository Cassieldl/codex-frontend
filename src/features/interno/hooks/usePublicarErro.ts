import { errosAdminKeys } from '../erros/hooks/errosAdminKeys'
import type { ErroAdminDetalhe } from '../erros/types/erroAdmin'
import { criarUsePublicar } from './criarUsePublicar'

/** `PUT /interno/erros/{id}/publicacao` (I20c) — role `erros-publicar`. */
export const usePublicarErro = criarUsePublicar<ErroAdminDetalhe>(
  (id) => `/erros/${id}/publicacao`,
  errosAdminKeys.all,
)
