import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import { camposVersaoKeys } from './camposVersaoKeys'

interface VariaveisRemoverCampoVersao {
  id: number
  etag?: string
}

/** `DELETE /interno/campos-versao/{id}` (I13b) - role `camposversao-remover`, `If-Match` obrigatório. */
export function useRemoverCampoVersao() {
  const queryClient = useQueryClient()

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: camposVersaoKeys.all })
  }

  return useMutation({
    mutationFn: async ({ id, etag }: VariaveisRemoverCampoVersao) => {
      await apiInterno.delete(`/campos-versao/${id}`, { etag })
    },
    onSuccess: invalidar,
    // Depois de um 409 a lista relida traz o etag novo, e a próxima confirmação passa.
    onError: (erro) => {
      if (ehConflitoDeConcorrencia(erro)) invalidar()
    },
  })
}
