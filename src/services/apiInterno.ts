import axios from 'axios'
import { garantirAutenticacao, getToken } from '../auth/keycloak'

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Valor do `xmin` (versão otimista, M9) devolvido no `GET` de detalhe.
     * Hooks de mutação (`useAtualizar<Entidade>`, `useRemover<Entidade>`,
     * `usePublicar<Entidade>`) repassam aqui o `etag` guardado no cache do
     * `useQuery` — nunca reconstroem o `If-Match` a partir de outra fonte.
     */
    etag?: string
  }
}

const METODOS_MUTACAO = new Set(['put', 'patch', 'delete'])

/**
 * Cliente HTTP da superfície INTERNA da API (`/api/v1/interno/*`). Injeta
 * `Authorization` sempre que houver sessão Keycloak ativa, e anexa
 * `If-Match` em toda mutação que declarar `etag` na config da chamada.
 */
export const apiInterno = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/interno`,
})

apiInterno.interceptors.request.use(async (config) => {
  await garantirAutenticacao() // só aqui — nunca no cliente público

  const token = getToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }

  const metodo = config.method?.toLowerCase()
  if (config.etag && metodo && METODOS_MUTACAO.has(metodo)) {
    config.headers.set('If-Match', config.etag)
  }

  return config
})
