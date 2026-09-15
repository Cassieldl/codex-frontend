import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { ArtigoAdminDetalhe, ArtigoFormDto } from '../types/artigoAdmin'
import { artigosAdminKeys } from './artigosAdminKeys'

interface EnvelopeArtigoAdmin {
  data: ArtigoAdminDetalhe
  message: string | null
}

/**
 * `POST /interno/artigos` (I25) — role `artigos-adicionar`, responde `201` com
 * o detalhe enveloped em `data`.
 *
 * **Sem `If-Match`**: o recurso ainda não existe, logo não há versão a
 * conferir. Invalida `all` (e não só `lists()`) porque criar o artigo
 * reservado muda também a resposta de I36, que a tela 16 consulta.
 */
export function useCriarArtigo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: ArtigoFormDto) => {
      const { data } = await apiInterno.post<EnvelopeArtigoAdmin>('/artigos', dto)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artigosAdminKeys.all })
    },
  })
}
