import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { ComunicadoAdminDetalhe, ComunicadoFormDto } from '../types/comunicadoAdmin'
import { comunicadosAdminKeys } from './comunicadosAdminKeys'

interface EnvelopeComunicadoAdmin {
  data: ComunicadoAdminDetalhe
  message: string | null
}

/**
 * `POST /interno/comunicados` (I32) — role `comunicados-adicionar`, responde
 * `201` com o detalhe enveloped em `data`.
 *
 * **Sem `If-Match`**: o recurso ainda não existe, logo não há versão a
 * conferir. `publicado` também não viaja — publicação só muda por I35 (M19).
 */
export function useCriarComunicado() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: ComunicadoFormDto) => {
      const { data } = await apiInterno.post<EnvelopeComunicadoAdmin>('/comunicados', dto)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comunicadosAdminKeys.lists() })
    },
  })
}
