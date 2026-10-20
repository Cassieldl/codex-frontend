import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import type { AtualizarVersaoLayoutDto, VersaoLayoutAdmin } from '../types/versaoLayoutAdmin'
import { versoesLayoutKeys } from './versoesLayoutKeys'

interface EnvelopeVersaoLayoutAdmin {
  data: VersaoLayoutAdmin
  message: string | null
}

interface VariaveisAtualizarVersaoLayout {
  id: number
  dto: AtualizarVersaoLayoutDto
  etag?: string
}

/**
 * `PUT /interno/layout/versoes/{id}` (I15c) — role `versoeslayout-atualizar`,
 * `If-Match` obrigatório. `409` também quando `ordem` colide na reordenação.
 * No `409` de concorrência relê a lista, de onde sai o etag da segunda tentativa.
 */
export function useAtualizarVersaoLayout() {
  const queryClient = useQueryClient()

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: versoesLayoutKeys.lists() })
  }

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarVersaoLayout) => {
      const { data } = await apiInterno.put<EnvelopeVersaoLayoutAdmin>(
        `/layout/versoes/${id}`,
        dto,
        { etag },
      )
      return data.data
    },
    onSuccess: invalidar,
    onError: (erro) => {
      if (ehConflitoDeConcorrencia(erro)) invalidar()
    },
  })
}
