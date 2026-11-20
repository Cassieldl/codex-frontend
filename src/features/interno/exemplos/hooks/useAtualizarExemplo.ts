import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { versoesAdminKeys } from '../../provedores/hooks/versoesAdminKeys'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import type { AtualizarExemploDto, ExemploAdmin } from '../types/exemploAdmin'
import { exemplosAdminKeys } from './exemplosAdminKeys'

interface EnvelopeExemploAdmin {
  data: ExemploAdmin
  message: string | null
}

export interface VariaveisAtualizarExemplo {
  id: number
  versaoId: number
  dto: AtualizarExemploDto
  etag?: string
}

/**
 * `PUT /interno/exemplos/{id}` (I41) - role `exemplos-atualizar`, `If-Match`
 * obrigatório. Como em I39, invalida também o detalhe da versão pai: C5 avança o
 * `xmin` dela a cada escrita de exemplo. No `409` de concorrência relê as duas,
 * para a segunda tentativa levar o etag novo.
 */
export function useAtualizarExemplo() {
  const queryClient = useQueryClient()

  function invalidar({ versaoId }: VariaveisAtualizarExemplo) {
    void queryClient.invalidateQueries({ queryKey: exemplosAdminKeys.porVersao(versaoId) })
    void queryClient.invalidateQueries({ queryKey: versoesAdminKeys.detail(versaoId) })
  }

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarExemplo) => {
      const { data } = await apiInterno.put<EnvelopeExemploAdmin>(`/exemplos/${id}`, dto, { etag })
      return data.data
    },
    onSuccess: (_dados, variaveis) => invalidar(variaveis),
    onError: (erro, variaveis) => {
      if (ehConflitoDeConcorrencia(erro)) invalidar(variaveis)
    },
  })
}
