/** Quantas vezes vale retentar antes de desistir, quando o erro é mesmo transiente. */
const TENTATIVAS_EXTRAS = 2

/**
 * Política única de retentativa das leituras públicas: insiste no que pode
 * melhorar sozinho (rede caída, 5xx, resposta não classificada) e desiste na
 * hora do que foi classificado por status — `404`, `410` e `422` não mudam de
 * resposta por insistência.
 *
 * Sem isso, endereço inexistente segurava a tela em "Carregando provedor…" por
 * vários segundos de backoff antes de dizer qualquer coisa, e o que dizia era
 * "Tentar novamente".
 *
 * `erroClassificado` é o que a classificação do próprio hook produziu: a
 * instância de `Erro*Http`, ou `null` quando o status não se encaixou em
 * nenhum caso conhecido.
 */
export function devoRetentar(contagemDeTentativas: number, erroClassificado: unknown): boolean {
  if (erroClassificado !== null && erroClassificado !== undefined) return false

  return contagemDeTentativas < TENTATIVAS_EXTRAS
}
