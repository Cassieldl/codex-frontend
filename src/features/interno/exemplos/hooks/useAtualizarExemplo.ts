import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { versoesAdminKeys } from '../../provedores/hooks/versoesAdminKeys'
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
 * `PUT /interno/exemplos/{id}` (I41) — role `exemplos-atualizar`, `If-Match`
 * obrigatório. Como em I39, invalida também o detalhe da versão pai: C5 avança o
 * `xmin` dela a cada escrita de exemplo.
 */
export function useAtualizarExemplo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarExemplo) => {
      const { data } = await apiInterno.put<EnvelopeExemploAdmin>(`/exemplos/${id}`, dto, { etag })
      return data.data
    },
    onSuccess: (_dados, variaveis) => {
      queryClient.invalidateQueries({ queryKey: exemplosAdminKeys.porVersao(variaveis.versaoId) })
      queryClient.invalidateQueries({ queryKey: versoesAdminKeys.detail(variaveis.versaoId) })
    },
  })
}
