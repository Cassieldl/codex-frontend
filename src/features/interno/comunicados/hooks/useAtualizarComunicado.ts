import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { ComunicadoAdminDetalhe, ComunicadoFormDto } from '../types/comunicadoAdmin'
import { comunicadosAdminKeys } from './comunicadosAdminKeys'

interface EnvelopeComunicadoAdmin {
  data: ComunicadoAdminDetalhe
  message: string | null
}

interface VariaveisAtualizarComunicado {
  id: number
  dto: ComunicadoFormDto
  etag?: string
}

/**
 * `PUT /interno/comunicados/{id}` (I33) — role `comunicados-atualizar`,
 * `If-Match` obrigatório. É por aqui que se **estende a expiração** de um
 * comunicado encerrado antes de republicar (decisoes.md B-4).
 *
 * `409` nunca reseta o modal: a página mantém o formulário aberto com o que
 * foi digitado e oferece recarregar o registro.
 */
export function useAtualizarComunicado() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarComunicado) => {
      const { data } = await apiInterno.put<EnvelopeComunicadoAdmin>(`/comunicados/${id}`, dto, {
        etag,
      })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comunicadosAdminKeys.all })
    },
  })
}
