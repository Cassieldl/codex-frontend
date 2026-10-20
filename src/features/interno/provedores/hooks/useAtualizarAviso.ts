import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import type { AtualizarAvisoDto, AvisoAdmin } from '../types/avisoAdmin'

interface EnvelopeAvisoAdmin {
  data: AvisoAdmin
  message: string | null
}

interface VariaveisAtualizarAviso {
  id: number
  dto: AtualizarAvisoDto
  etag?: string
}

/**
 * `PUT /interno/avisos/{id}` (I14b) — única rota de atualização para os dois
 * escopos (o `id` já identifica um aviso com escopo fixo, nunca muda). Quem
 * chama passa a `queryKey` do pai (provedor ou versão) a invalidar — o hook
 * não conhece o escopo, só o `id` do aviso. O aviso vive dentro desse detalhe,
 * então é ele que o `409` de concorrência relê para a segunda tentativa.
 */
export function useAtualizarAviso(chaveParaInvalidar: QueryKey) {
  const queryClient = useQueryClient()

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: chaveParaInvalidar })
  }

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarAviso) => {
      const { data } = await apiInterno.put<EnvelopeAvisoAdmin>(`/avisos/${id}`, dto, { etag })
      return data.data
    },
    onSuccess: invalidar,
    onError: (erro) => {
      if (ehConflitoDeConcorrencia(erro)) invalidar()
    },
  })
}
