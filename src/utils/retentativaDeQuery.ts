import { isAxiosError } from 'axios'

/** Quantas vezes vale retentar antes de desistir, quando o erro é mesmo transiente. */
const TENTATIVAS_EXTRAS = 2

/** Status do erro do axios sem classificação ou do `Erro*Http` que o hook produziu. */
function statusHttpDoErro(erro: unknown): number | undefined {
  if (isAxiosError(erro)) return erro.response?.status
  if (erro instanceof Error && 'status' in erro && typeof erro.status === 'number') {
    return erro.status
  }
  return undefined
}

/**
 * Política de retentativa das leituras públicas que classificam o erro por status. Rede caída e
 * 5xx podem melhorar sozinhos; um 4xx, classificado pelo hook ou não, devolve a mesma resposta na
 * próxima vez, e o backoff segurava a tela no skeleton por segundos antes de dizer o desfecho.
 *
 * `erro` é o que a consulta lançou, sem filtro: o `Erro*Http` do hook ou o erro original.
 */
export function devoRetentar(contagemDeTentativas: number, erro: unknown): boolean {
  const status = statusHttpDoErro(erro)
  if (status !== undefined && status >= 400 && status < 500) return false

  return contagemDeTentativas < TENTATIVAS_EXTRAS
}
