import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import type { ProvedorAdminDetalhe } from '../types/provedorAdmin'
import { provedoresAdminKeys } from './provedoresAdminKeys'

interface EnvelopeProvedorAdminDetalhe {
  data: ProvedorAdminDetalhe
  message: string | null
}

export interface VariaveisTrocarSlugProvedor {
  id: number
  slug: string
  etag?: string
}

/**
 * `PUT /interno/provedores/{id}/slug` (I37) - reusa a role
 * `provedores-atualizar`, `If-Match` obrigatório como toda escrita interna.
 *
 * `409` (o endereço já pertence a outra entidade) e `422` (endereço igual ao
 * atual) propagam como `AxiosError`: os dois são erros do valor digitado, e
 * quem chama decide onde mostrá-los.
 *
 * Invalida o detalhe **e** a listagem: o slug é o endereço público do provedor e
 * aparece nos dois lugares - deixar a lista com o valor velho entregaria um link
 * que só redireciona. O `409` de concorrência relê os dois também, para a
 * segunda tentativa levar o etag novo.
 */
export function useTrocarSlugProvedor() {
  const queryClient = useQueryClient()

  function invalidar({ id }: VariaveisTrocarSlugProvedor) {
    void queryClient.invalidateQueries({ queryKey: provedoresAdminKeys.detail(id) })
    void queryClient.invalidateQueries({ queryKey: provedoresAdminKeys.lists() })
  }

  return useMutation({
    mutationFn: async ({ id, slug, etag }: VariaveisTrocarSlugProvedor) => {
      const { data } = await apiInterno.put<EnvelopeProvedorAdminDetalhe>(
        `/provedores/${id}/slug`,
        { slug },
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
