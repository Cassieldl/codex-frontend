import type { CampoVersaoPublico, NaturezaOperacaoPublica } from '../types/versaoProvedorPagina'
import { ehCampoNaturezaOperacao } from './naturezaOperacao'

/** Um valor que o InvoiCy troca no caminho: o que o integrador envia e o que o provedor recebe. */
export interface ConversaoDeValor {
  valorEnviado: string
  valorRecebido: string
  descricao: string
  aConfirmar: boolean
}

type CampoDaConversao = Pick<CampoVersaoPublico, 'caminhoXml' | 'exemplo'>

function converte(natureza: NaturezaOperacaoPublica): boolean {
  return String(natureza.codigoInvoicy) !== natureza.valorProvedor.trim()
}

function naturezaDoExemplo(
  exemplo: string | null,
  naturezas: NaturezaOperacaoPublica[],
): NaturezaOperacaoPublica | undefined {
  const valor = exemplo?.trim()
  if (!valor) return undefined
  return naturezas.find((natureza) => String(natureza.codigoInvoicy) === valor)
}

/**
 * Conversão que ilustra o campo, ou `null` quando o campo não tem conversão. Prefere o exemplo do
 * próprio campo; se ele não converte, usa o primeiro código da tabela que converte.
 */
export function conversaoDoCampo(
  campo: CampoDaConversao,
  naturezas: NaturezaOperacaoPublica[],
): ConversaoDeValor | null {
  if (!ehCampoNaturezaOperacao(campo)) return null

  const doExemplo = naturezaDoExemplo(campo.exemplo, naturezas)
  const escolhida = doExemplo && converte(doExemplo) ? doExemplo : naturezas.find(converte)
  if (!escolhida) return null

  return {
    valorEnviado: String(escolhida.codigoInvoicy),
    valorRecebido: escolhida.valorProvedor.trim(),
    descricao: escolhida.descricao,
    aConfirmar: escolhida.aConfirmar,
  }
}

/**
 * Exemplo que o XML do provedor mostra. No campo com de-para, o valor do InvoiCy não chega como
 * veio: vale o valor convertido, e sem linha na tabela o valor recebido é desconhecido.
 */
export function exemploNoProvedor(
  campo: CampoDaConversao,
  naturezas: NaturezaOperacaoPublica[],
): string | null {
  if (!ehCampoNaturezaOperacao(campo) || naturezas.length === 0) return campo.exemplo
  return naturezaDoExemplo(campo.exemplo, naturezas)?.valorProvedor.trim() ?? null
}
