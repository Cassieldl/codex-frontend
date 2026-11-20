import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { versoesAdminKeys } from '../../provedores/hooks/versoesAdminKeys'
import type { CriarExemploDto, ExemploAdmin } from '../types/exemploAdmin'
import { exemplosAdminKeys } from './exemplosAdminKeys'

interface EnvelopeExemploAdmin {
  data: ExemploAdmin
  message: string | null
}

/**
 * `POST /interno/versoes/{id}/exemplos` (I39) - role `exemplos-adicionar`, sem
 * `If-Match` (o recurso ainda não existe). `409` para nome duplicado na versão e
 * `422` para o 11º exemplo (cap de 10, C3) propagam como `AxiosError`.
 *
 * Invalida **dois** alvos porque o backend toca a versão pai no mesmo
 * `SaveChanges` (decisão C5): o `xmin` dela avança, e um `etag` guardado do
 * detalhe da versão vira lixo. Sem invalidar o detalhe, a próxima verificação
 * ou publicação daquela versão manda um `If-Match` velho e leva `409` sem que a
 * tela saiba explicar por quê.
 */
export function useCriarExemplo(versaoId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CriarExemploDto) => {
      const { data } = await apiInterno.post<EnvelopeExemploAdmin>(
        `/versoes/${versaoId}/exemplos`,
        dto,
      )
      return data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exemplosAdminKeys.porVersao(versaoId) })
      void queryClient.invalidateQueries({ queryKey: versoesAdminKeys.detail(versaoId) })
    },
  })
}
