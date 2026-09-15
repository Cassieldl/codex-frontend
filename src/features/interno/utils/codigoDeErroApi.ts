import { isAxiosError } from 'axios'

/**
 * Extrai o `code` do envelope de erro da API (`{ error: { code, message } }`).
 * Devolve `null` para qualquer coisa fora desse formato — erro de rede, HTML
 * de proxy, resposta sem envelope.
 *
 * Único extrator da área interna: cada entidade mantém a própria tabela de
 * recuperação (o que o editor faz a seguir muda por entidade), mas a leitura
 * do envelope é a mesma em todas — duas cópias divergiriam no dia em que o
 * formato do envelope mudasse.
 */
export function extrairCodigoDeErroApi(erro: unknown): string | null {
  if (!isAxiosError(erro)) return null

  const data: unknown = erro.response?.data
  if (typeof data !== 'object' || data === null) return null

  const envelope = (data as Record<string, unknown>).error
  if (typeof envelope !== 'object' || envelope === null) return null

  const codigo = (envelope as Record<string, unknown>).code
  return typeof codigo === 'string' ? codigo : null
}
