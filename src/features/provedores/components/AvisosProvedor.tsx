import type { AvisoPublico } from '../types/provedor'
import { CartaoDeAvisos } from './CartaoDeAvisos'

export interface AvisosProvedorProps {
  nomeProvedor: string
  avisos: AvisoPublico[]
}

/**
 * "Avisos do provedor" (U8), na lateral da aba Erros: valem para qualquer versão. Distinta de
 * "Avisos desta versão" (`AvisosVersao`) por rótulo de seção e posição; a severidade usa a mesma
 * paleta nos dois escopos, de propósito (§3.3b/§7.6.1).
 */
export function AvisosProvedor({ nomeProvedor, avisos }: AvisosProvedorProps) {
  return (
    <CartaoDeAvisos
      idDoTitulo="avisos-provedor-titulo"
      titulo="Avisos do provedor"
      subtitulo={`Valem para ${nomeProvedor} em qualquer versão.`}
      avisos={avisos}
    />
  )
}
