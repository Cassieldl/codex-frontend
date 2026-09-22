import { caminhoInternoSeguro } from './caminhoInternoSeguro'

export interface NavegacaoCanonica {
  href: string
  replace: true
}

/**
 * Decide se a página deve navegar para o caminho canônico que o BACKEND
 * devolveu (nunca o inverso) e devolve o destino já validado por
 * `caminhoInternoSeguro` (BAIXO-02) — `null` quando não há nada a corrigir.
 *
 * Único ponto de comparação para as três páginas de detalhe público
 * (provedor, erro, artigo) — `arquitetura.md` §5.F/F2. Existe porque o `308`
 * nunca chega ao cliente (XHR segue redirect sozinho, PQ-01): a única forma
 * de descobrir que o slug da URL está desatualizado é comparar o que o
 * backend devolveu contra o que está na barra de endereços.
 */
export function corrigirUrlCanonica(
  caminhoAtual: string,
  caminhoCanonico: string,
): NavegacaoCanonica | null {
  if (caminhoCanonico === caminhoAtual) return null
  const destino = caminhoInternoSeguro(caminhoCanonico)
  return destino ? { href: destino, replace: true } : null
}
