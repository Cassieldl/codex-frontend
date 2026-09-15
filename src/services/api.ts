import axios from 'axios'

/**
 * Cliente HTTP da superfície PÚBLICA da API (`/api/v1/*`). Nunca injeta
 * `Authorization` — usado por rotas anônimas (busca, provedores, erros).
 * Quem precisa de autenticação usa `apiInterno` (services/apiInterno.ts).
 */
export const apiPublico = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})
