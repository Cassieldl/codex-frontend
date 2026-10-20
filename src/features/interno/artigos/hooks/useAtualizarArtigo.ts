import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import type { ArtigoAdminDetalhe, ArtigoFormDto } from '../types/artigoAdmin'
import { artigosAdminKeys } from './artigosAdminKeys'

interface EnvelopeArtigoAdmin {
  data: ArtigoAdminDetalhe
  message: string | null
}

interface VariaveisAtualizarArtigo {
  id: number
  dto: ArtigoFormDto
  etag?: string
}

/**
 * `PUT /interno/artigos/{id}` (I26) — role `artigos-atualizar`, `If-Match`
 * obrigatório. Trocar o `tipo` é permitido (`decisoes.md` B-2) e dispara
 * reindexação no backend; o cliente não faz nada a mais por isso.
 *
 * `409` nunca reseta o modal: a página mantém o formulário aberto com o que
 * foi digitado, e o hook relê o registro para a segunda tentativa levar o etag novo.
 */
export function useAtualizarArtigo() {
  const queryClient = useQueryClient()

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: artigosAdminKeys.all })
  }

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarArtigo) => {
      const { data } = await apiInterno.put<EnvelopeArtigoAdmin>(`/artigos/${id}`, dto, { etag })
      return data.data
    },
    onSuccess: invalidar,
    onError: (erro) => {
      if (ehConflitoDeConcorrencia(erro)) invalidar()
    },
  })
}
