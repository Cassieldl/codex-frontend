import type { VizinhoDeCampo } from '../../../types/vizinhoDeCampo'
import type { FormatoDaEstrutura } from './estruturaLayout'
import type { CampoLayoutPublico } from './layoutPublico'

/** Destino dos atalhos "Ver na estrutura": a versão e os formatos em que a tag existe. */
export interface AtalhoDaEstrutura {
  versaoSlug: string
  formatos: readonly FormatoDaEstrutura[]
}

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
  /** Sem ele, o modal não mostra os atalhos para a estrutura. */
  estrutura?: AtalhoDaEstrutura
}
