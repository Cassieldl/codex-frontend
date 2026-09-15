import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { ArtigoAdminDetalhe } from '../types/artigoAdmin'
import { artigosAdminKeys } from './artigosAdminKeys'

interface EnvelopeArtigoAdmin {
  data: ArtigoAdminDetalhe
  message: string | null
}

interface VariaveisVerificarArtigo {
  id: number
  /** Data pura (`AAAA-MM-DD`), nunca no futuro — o backend recusa com `422`. */
  verificadoEm: string
  etag?: string
}

/**
 * `PUT /interno/artigos/{id}/verificacao` (I29) — role `artigos-atualizar`,
 * `If-Match` obrigatório. Mesmo espírito de `useVerificarVersao`: registrar
 * que o conteúdo foi conferido é ação própria, separada de editar o texto.
 */
export function useVerificarArtigo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, verificadoEm, etag }: VariaveisVerificarArtigo) => {
      const { data } = await apiInterno.put<EnvelopeArtigoAdmin>(
        `/artigos/${id}/verificacao`,
        { verificadoEm },
        { etag },
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artigosAdminKeys.all })
    },
  })
}
