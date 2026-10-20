import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import { errosAdminKeys } from './errosAdminKeys'

interface VariaveisRemoverErro {
  id: number
  etag?: string
}

/** `DELETE /interno/erros/{id}` (I20b) — role `erros-remover`, `If-Match` obrigatório. */
export function useRemoverErro() {
  const queryClient = useQueryClient()

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: errosAdminKeys.lists() })
  }

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverErro) => {
      await apiInterno.delete(`/erros/${id}`, { etag })
    },
    onSuccess: invalidar,
    // Depois de um 409 a lista relida traz o etag novo, e a próxima confirmação passa.
    onError: (erro) => {
      if (ehConflitoDeConcorrencia(erro)) invalidar()
    },
  })
}
