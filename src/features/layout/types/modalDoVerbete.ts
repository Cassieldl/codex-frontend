import type { VizinhoDeCampo } from '../../../types/vizinhoDeCampo'
import type { CampoLayoutPublico } from './layoutPublico'

export interface ModalDoVerbeteProps {
  campo: CampoLayoutPublico
  /** Sobretítulo: "Serviço › Valores › IBSCBS". */
  trilha: string
  /** Rótulo cru da versão que o selo "novo na versão …" completa. */
  versaoRotulo: string
  /** 1-based na sequência visível. */
  posicao: number
  total: number
  filtroAtivo: boolean
  anterior: VizinhoDeCampo | null
  proximo: VizinhoDeCampo | null
  onNavegar: (slug: string) => void
  onFechar: () => void
  devolverFoco: () => void
  /** Endereço absoluto copiado pelo botão do cabeçalho: origem + `campo.urlCanonica`. */
  linkDoCampo: string
}
