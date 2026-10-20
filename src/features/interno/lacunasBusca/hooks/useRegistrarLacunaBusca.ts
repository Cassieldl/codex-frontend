import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiInterno } from '../../../../services/apiInterno'
import type { LacunaBusca, RegistrarLacunaBuscaDto } from '../types/lacunaBusca'
import { lacunasBuscaKeys } from './lacunasBuscaKeys'

interface EnvelopeLacunaBusca {
  data: LacunaBusca
  message: string | null
}

/**
 * `POST /interno/lacunas-busca` — role `lacunasbusca-adicionar`, `201` com a lacuna criada.
 * O corpo carrega só termo, parceiro e chamado: quem registrou e quando o servidor tira do token.
 */
export function useRegistrarLacunaBusca() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: RegistrarLacunaBuscaDto) => {
      const { data } = await apiInterno.post<EnvelopeLacunaBusca>('/lacunas-busca', dto)
      return data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lacunasBuscaKeys.all })
    },
  })
}
