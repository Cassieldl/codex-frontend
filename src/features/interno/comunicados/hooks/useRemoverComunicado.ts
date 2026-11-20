import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import { comunicadosAdminKeys } from './comunicadosAdminKeys'

interface VariaveisRemoverComunicado {
  id: number
  etag?: string
}

/**
 * `DELETE /interno/comunicados/{id}` (I34) - role `comunicados-remover`,
 * `If-Match` obrigatório, responde `204` sem corpo.
 */
export function useRemoverComunicado() {
  const queryClient = useQueryClient()

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: comunicadosAdminKeys.all })
  }

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverComunicado) => {
      await apiInterno.delete(`/comunicados/${id}`, { etag })
    },
    onSuccess: invalidar,
    // Depois de um 409 a lista relida traz o etag novo, e a próxima confirmação passa.
    onError: (erro) => {
      if (ehConflitoDeConcorrencia(erro)) invalidar()
    },
  })
}
