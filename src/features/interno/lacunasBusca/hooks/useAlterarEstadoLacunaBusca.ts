import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { AlteracaoEstadoLacunaBusca, AlterarEstadoLacunaBuscaDto } from '../types/lacunaBusca'
import { lacunasBuscaKeys } from './lacunasBuscaKeys'

interface EnvelopeAlteracaoEstado {
  data: AlteracaoEstadoLacunaBusca
}

interface VariaveisAlterarEstadoLacunaBusca {
  /** Ocorrência a alterar — na fila agrupada, a `lacunaReferenciaId` do termo. */
  id: number
  dto: AlterarEstadoLacunaBuscaDto
  etag?: string
}

/**
 * `PUT /interno/lacunas-busca/{id}/estado` — role `lacunasbusca-atualizar`, `If-Match` obrigatório.
 * Resolve, descarta ou reabre; com `incluirMesmoTermo` as demais ocorrências abertas do mesmo
 * termo mudam junto, na mesma transação.
 *
 * A fila é recarregada também quando a escrita falha: `409` e `422 VALIDACAO_NEGOCIO` significam
 * que a linha em tela está velha, e a lista atual é o que desfaz o engano.
 */
export function useAlterarEstadoLacunaBusca() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAlterarEstadoLacunaBusca) => {
      const { data } = await apiInterno.put<EnvelopeAlteracaoEstado>(
        `/lacunas-busca/${id}/estado`,
        dto,
        { etag },
      )
      return data.data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: lacunasBuscaKeys.all })
    },
  })
}
