import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import type { AtualizarErroDto, ErroAdminDetalhe } from '../types/erroAdmin'
import { errosAdminKeys } from './errosAdminKeys'

interface EnvelopeErroAdminDetalhe {
  data: ErroAdminDetalhe
  message: string | null
}

interface VariaveisAtualizarErro {
  id: number
  dto: AtualizarErroDto
  etag?: string
}

/**
 * `PUT /interno/erros/{id}` (I20a) — role `erros-atualizar`, `If-Match`
 * obrigatório (M9). `409` nunca reseta o modal — a página mantém o formulário
 * aberto com o que foi digitado, e o hook relê o detalhe para a segunda
 * tentativa levar o etag novo.
 */
export function useAtualizarErro() {
  const queryClient = useQueryClient()

  function invalidarLista() {
    void queryClient.invalidateQueries({ queryKey: errosAdminKeys.lists() })
  }

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarErro) => {
      const { data } = await apiInterno.put<EnvelopeErroAdminDetalhe>(`/erros/${id}`, dto, {
        etag,
      })
      return data.data
    },
    // No sucesso o modal fecha: reler o detalhe seria uma requisição que ninguém usa.
    onSuccess: invalidarLista,
    onError: (erro, { id }) => {
      if (!ehConflitoDeConcorrencia(erro)) return
      invalidarLista()
      void queryClient.invalidateQueries({ queryKey: errosAdminKeys.detail(id) })
    },
  })
}
