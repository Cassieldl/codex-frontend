import axios, { isAxiosError } from 'axios'
import { garantirAutenticacao, getToken, renovarTokenSeNecessario } from '../auth/keycloak'
import { encerrarSessaoEIrParaEntrada } from '../auth/sessaoExpirada'

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Valor do `xmin` (versão otimista) devolvido no `GET` de detalhe.
     * Hooks de mutação (`useAtualizar<Entidade>`, `useRemover<Entidade>`,
     * `usePublicar<Entidade>`) repassam aqui o `etag` guardado no cache do
     * `useQuery`: nunca reconstroem o `If-Match` a partir de outra fonte.
     */
    etag?: string
  }
}

const METODOS_MUTACAO = new Set(['put', 'patch', 'delete'])

/**
 * Cliente HTTP da superfície INTERNA da API (`/api/v1/interno/*`). Renova e injeta
 * `Authorization` sempre que houver sessão Keycloak ativa, e anexa `If-Match` em
 * toda mutação que declarar `etag` na config da chamada.
 */
export const apiInterno = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/interno`,
})

apiInterno.interceptors.request.use(async (config) => {
  const autenticado = await garantirAutenticacao() // só aqui, nunca no cliente público

  if (autenticado) {
    try {
      await renovarTokenSeNecessario()
    } catch {
      encerrarSessaoEIrParaEntrada()
      throw new Error('A sessão expirou e não pôde ser renovada.')
    }
  }

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

// Só 401 de requisição que levou token significa sessão perdida; sem token é o guard que decide.
apiInterno.interceptors.response.use(undefined, (erro: unknown) => {
  if (
    isAxiosError(erro) &&
    erro.response?.status === 401 &&
    erro.config?.headers?.has('Authorization')
  ) {
    encerrarSessaoEIrParaEntrada()
  }
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- repassa o erro do Axios, lido com isAxiosError
  return Promise.reject(erro)
})
