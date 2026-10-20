import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import type { AtualizarProvedorDto, ProvedorAdminDetalhe } from '../types/provedorAdmin'
import { provedoresAdminKeys } from './provedoresAdminKeys'

interface EnvelopeProvedorAdminDetalhe {
  data: ProvedorAdminDetalhe
  message: string | null
}

interface VariaveisAtualizarProvedor {
  id: number
  dto: AtualizarProvedorDto
  etag?: string
}

/**
 * `PUT /interno/provedores/{id}` (I4) — role `provedores-atualizar`, `If-Match`
 * obrigatório (M9). `409` propaga como `AxiosError` — quem chama decide como
 * avisar e **nunca** reseta o formulário (o formulário só é limpo depois de
 * um sucesso real, nunca automaticamente em erro). No `409` de concorrência o
 * hook relê detalhe e lista, para a segunda tentativa levar o etag novo.
 */
export function useAtualizarProvedor() {
  const queryClient = useQueryClient()

  function invalidar({ id }: VariaveisAtualizarProvedor) {
    void queryClient.invalidateQueries({ queryKey: provedoresAdminKeys.detail(id) })
    void queryClient.invalidateQueries({ queryKey: provedoresAdminKeys.lists() })
  }

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarProvedor) => {
      const { data } = await apiInterno.put<EnvelopeProvedorAdminDetalhe>(
        `/provedores/${id}`,
        dto,
        { etag },
      )
      return data.data
    },
    onSuccess: (_dados, variaveis) => invalidar(variaveis),
    onError: (erro, variaveis) => {
      if (ehConflitoDeConcorrencia(erro)) invalidar(variaveis)
    },
  })
}
