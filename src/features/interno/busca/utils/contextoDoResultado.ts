import type { ResultadoItem } from '../../../busca/types/resultadoBusca'

type ItemComContexto = Pick<ResultadoItem, 'tipo' | 'provedorNome' | 'versaoRotulo' | 'versoes'>

/**
 * Provedor e versão de um resultado, o que separa dois itens de mesmo título. Erro sem provedor
 * nem versão vale para qualquer provedor e aparece como "Geral", nunca como espaço vazio.
 */
export function contextoDoResultado(item: ItemComContexto): string | null {
  const versao = item.versaoRotulo ?? item.versoes?.join(', ') ?? null
  const partes = [item.provedorNome, versao].filter((parte): parte is string => Boolean(parte))

  if (partes.length > 0) return partes.join(' ')
  return item.tipo === 'erro' ? 'Geral' : null
}
