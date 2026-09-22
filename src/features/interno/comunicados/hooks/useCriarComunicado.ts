import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { ComunicadoAdminDetalhe, ComunicadoFormDto } from '../types/comunicadoAdmin'
import { comunicadosAdminKeys } from './comunicadosAdminKeys'

interface EnvelopeComunicadoAdmin {
  data: ComunicadoAdminDetalhe
  message: string | null
}

export interface ResultadoCriarComunicado {
  comunicado: ComunicadoAdminDetalhe
  /**
   * `ApiResponse.Message` do backend, que descreve o que **aconteceu**
   * ("Comunicado publicado." × "Comunicado criado como rascunho."). Sai daqui
   * para que a tela nunca infira o desfecho do `publicar` que ela pediu — pedir
   * e conseguir são coisas diferentes (D-1/G3).
   */
  mensagem: string | null
}

/**
 * `POST /interno/comunicados` (I32) — role `comunicados-adicionar`, responde
 * `201` com o detalhe enveloped em `data`.
 *
 * **Sem `If-Match`**: o recurso ainda não existe, logo não há versão a
 * conferir. `publicado` não viaja como campo de escrita; o que viaja é
 * `publicar` (D-1), e só quando o chamador o define — quem não define continua
 * criando em rascunho, como antes.
 */
export function useCriarComunicado() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: ComunicadoFormDto): Promise<ResultadoCriarComunicado> => {
      const { data } = await apiInterno.post<EnvelopeComunicadoAdmin>('/comunicados', dto)
      return { comunicado: data.data, mensagem: data.message }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comunicadosAdminKeys.lists() })
    },
  })
}
