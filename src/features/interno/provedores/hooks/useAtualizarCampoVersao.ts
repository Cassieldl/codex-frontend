import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import { ehConflitoDeConcorrencia } from '../../utils/codigoDeErroApi'
import type { AtualizarCampoVersaoDto, CampoVersaoAdmin } from '../types/campoVersaoAdmin'
import { camposVersaoKeys } from './camposVersaoKeys'

interface EnvelopeCampoVersaoAdmin {
  data: CampoVersaoAdmin
  message: string | null
}

export interface VariaveisAtualizarCampoVersao {
  id: number
  dto: AtualizarCampoVersaoDto
  etag?: string
}

/**
 * `PUT /interno/campos-versao/{id}` (I13a) - role `camposversao-atualizar`,
 * `If-Match` obrigatório (M9). Em `409`, esta mutation **não** limpa nada -
 * `mutation.variables` continua com o payload submetido, e quem chama
 * (`CampoVersaoForm`) nunca reseta o formulário em erro, só em sucesso real.
 * No `409` de concorrência relê a lista, de onde sai o etag da segunda tentativa.
 */
export function useAtualizarCampoVersao() {
  const queryClient = useQueryClient()

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: camposVersaoKeys.all })
  }

  return useMutation({
    mutationFn: async ({ id, dto, etag }: VariaveisAtualizarCampoVersao) => {
      const { data } = await apiInterno.put<EnvelopeCampoVersaoAdmin>(`/campos-versao/${id}`, dto, {
        etag,
      })
      return data.data
    },
    onSuccess: invalidar,
    onError: (erro) => {
      if (ehConflitoDeConcorrencia(erro)) invalidar()
    },
  })
}
