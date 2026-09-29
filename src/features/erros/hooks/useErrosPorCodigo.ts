import { useQuery } from '@tanstack/react-query'
import { apiPublico } from '../../../services/api'
import type { ErroListaItem } from '../types/erro'
import { errosKeys } from './errosKeys'

interface RespostaPaginadaErros {
  items: ErroListaItem[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

// Cobre com folga o cenário de desambiguação (mesmo código em provedores
// diferentes) sem paginar o atalho — M2 nunca lida com centenas de linhas.
const TAMANHO_PAGINA_ATALHO = 50

/**
 * O atalho só consulta a API com um código de fato preenchido. A condição mora aqui, e não
 * repetida na página, porque os dois lados precisam concordar: onde a query não roda, a página
 * tem de mostrar o estado de "sem código" — senão não sobra nada na tela.
 */
export function temCodigoParaBuscar(codigo: string) {
  return codigo.trim().length > 0
}

/**
 * `GET /erros?codigo=` (P5, `analise-backend.md` §4.1) — mesmo endpoint de
 * listagem de erros (`GET /erros`), filtrado por igualdade exata de `codigo`
 * (M2, atalho de desambiguação). `PaginatedResponse<T>` **cru**, sem envelope
 * `data` — nunca `{ data: [...] }` aqui (AP-ARQUITETURA-001).
 */
export function useErrosPorCodigo(codigo: string) {
  return useQuery({
    queryKey: errosKeys.list({ codigo }),
    queryFn: async () => {
      const { data } = await apiPublico.get<RespostaPaginadaErros>('/erros', {
        params: { codigo, tamanhoPagina: TAMANHO_PAGINA_ATALHO },
      })
      return data
    },
    enabled: temCodigoParaBuscar(codigo),
    retry: false,
  })
}
