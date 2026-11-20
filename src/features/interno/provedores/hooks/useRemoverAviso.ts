import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'

interface VariaveisRemoverAviso {
  id: number
  etag?: string
}

/** `DELETE /interno/avisos/{id}` (I14c) - role `avisos-remover`, `If-Match` obrigatório. */
export function useRemoverAviso(chaveParaInvalidar: QueryKey) {
  const queryClient = useQueryClient()

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: chaveParaInvalidar })
  }

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverAviso) => {
      await apiInterno.delete(`/avisos/${id}`, { etag })
    },
    onSuccess: invalidar,
    // Depois de um 409 a lista relida traz o etag novo, e a próxima confirmação passa.
    onError: (erro) => {
      if (ehConflitoDeConcorrencia(erro)) invalidar()
    },
  })
}
