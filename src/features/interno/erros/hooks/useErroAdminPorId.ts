import { useQuery } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { formatarEtagConcorrencia } from '../../utils/etagDeConcorrencia'
import type { ErroAdminDetalhe } from '../types/erroAdmin'
import { errosAdminKeys } from './errosAdminKeys'

interface EnvelopeErroAdminDetalhe {
  data: ErroAdminDetalhe
  message: string | null
}

/** `GET /interno/erros/{id}`: o agregado que o modal de edição precisa e que a lista não traz. */
export function useErroAdminPorId(id: number) {
  return useQuery({
    queryKey: errosAdminKeys.detail(id),
    queryFn: async () => {
      const response = await apiInterno.get<EnvelopeErroAdminDetalhe>(`/erros/${id}`)
      const erro = response.data.data
      const etagDoHeader = response.headers.etag as string | undefined

      return { ...erro, etag: etagDoHeader ?? formatarEtagConcorrencia(erro.versaoConcorrencia) }
    },
    enabled: id > 0,
    // Publicar ou salvar muda a versão: cada abertura do modal busca de novo, nunca do cache.
    gcTime: 0,
  })
}
