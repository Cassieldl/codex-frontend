import { handleApiError } from '../../../utils/handleApiError'
import { ehConflitoDeConcorrencia } from './codigoDeErroApi'

/** De onde veio a escrita: um formulário com o que a pessoa digitou ou uma ação de um clique. */
export type OrigemDaEscrita = 'formulario' | 'acao'

export const MENSAGEM_DE_CONFLITO: Record<OrigemDaEscrita, string> = {
  formulario:
    'Outra pessoa salvou este registro enquanto você editava. Os dados foram atualizados; se salvar de novo, a sua versão substitui a dela.',
  acao: 'Outra pessoa alterou este registro há pouco. Os dados foram atualizados; se tentar de novo, a sua ação vale sobre a versão dela.',
}

/**
 * Mensagem de erro das escritas da área interna. No `409 CONFLITO_CONCORRENCIA` o texto é do
 * cliente: o do backend manda recarregar, e aqui o hook já releu o registro sozinho. O resto
 * segue a mensagem do backend.
 */
export function mensagemDeErroDeEscrita(
  erro: unknown,
  origem: OrigemDaEscrita = 'formulario',
): string {
  if (ehConflitoDeConcorrencia(erro)) return MENSAGEM_DE_CONFLITO[origem]
  return handleApiError(erro)
}
