import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import { camposLayoutKeys } from './camposLayoutKeys'

interface VariaveisRemoverCampoLayout {
  id: number
  versaoLayoutId: number
  etag?: string
}

/** `DELETE /interno/campos-layout/{id}` (I17b) — role `campolayout-remover`, `If-Match` obrigatório. */
export function useRemoverCampoLayout() {
  const queryClient = useQueryClient()

  function invalidar(variaveis: VariaveisRemoverCampoLayout) {
    void queryClient.invalidateQueries({
      queryKey: camposLayoutKeys.porVersaoLayout(variaveis.versaoLayoutId),
    })
  }

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverCampoLayout) => {
      await apiInterno.delete(`/campos-layout/${id}`, { etag })
    },
    onSuccess: (_dados, variaveis) => invalidar(variaveis),
    // Depois de um 409 a lista relida traz o etag novo, e a próxima confirmação passa.
    onError: (erro, variaveis) => {
      if (ehConflitoDeConcorrencia(erro)) invalidar(variaveis)
    },
  })
}
