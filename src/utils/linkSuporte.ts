import { CONTEUDO_RODAPE_CONSTANTE } from './rodapeConteudoConstante'

/** Rótulo único do caminho de volta ao suporte (§7.2). */
export const ROTULO_FALAR_COM_SUPORTE = 'Falar com o suporte'

/** Monta o `mailto:` do suporte com assunto (e corpo, se houver) já codificados. */
export function montarLinkSuporte(assunto: string, corpo?: string): string {
  const { emailSuporte } = CONTEUDO_RODAPE_CONSTANTE.atendimento
  const base = `mailto:${emailSuporte}?subject=${encodeURIComponent(assunto)}`

  return corpo ? `${base}&body=${encodeURIComponent(corpo)}` : base
}
