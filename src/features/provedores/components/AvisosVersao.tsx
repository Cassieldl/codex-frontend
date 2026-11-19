import type { AvisoPublico } from '../types/provedor'
import { CartaoDeAvisos } from './CartaoDeAvisos'

export interface AvisosVersaoProps {
  avisos: AvisoPublico[]
}

/**
 * "Avisos desta versão", na lateral da aba Erros. Distinta de "Avisos do provedor"
 * (`AvisosProvedor`) por rótulo de seção e posição (U8, §7.6.3).
 */
export function AvisosVersao({ avisos }: AvisosVersaoProps) {
  return (
    <CartaoDeAvisos
      idDoTitulo="avisos-versao-titulo"
      titulo="Avisos desta versão"
      subtitulo="Leia antes de abrir chamado: muitos erros vêm daqui."
      avisos={avisos}
    />
  )
}
