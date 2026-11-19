import type {
  CampoVersaoPublico,
  ErroResumoPublico,
  NaturezaOperacaoPublica,
} from './versaoProvedorPagina'

export type SecaoInicialDoModal = 'rejeicoes'

export interface VizinhoDoCampo {
  campoLayoutSlug: string
  nome: string
}

export interface ModalDoCampoProps {
  campo: CampoVersaoPublico
  /** "Serviço › Valores › IBSCBS" = rótulo do bloco + subtítulo do subgrupo (quando existe). */
  trilha: string
  /** Sobretítulo: a trilha seguida de "Emissor Nacional 0.20". */
  provedorNome: string
  versaoRotulo: string
  /** 1-based na sequência visível. */
  posicao: number
  total: number
  /** Rodapé: "Campo N de M no filtro atual". */
  filtroAtivo: boolean
  anterior: VizinhoDoCampo | null
  proximo: VizinhoDoCampo | null
  /** Só na abertura: o modal rola até a seção. Anterior/Próximo sempre voltam ao topo. */
  secaoInicial?: SecaoInicialDoModal
  onNavegar: (campoLayoutSlug: string) => void
  onFechar: () => void
  /**
   * Dono único do foco de retorno. O `Modal` chama isto uma vez, depois de o diálogo sair do DOM,
   * e não devolve o foco ao elemento que o abriu.
   */
  devolverFoco: () => void
  errosResumo: ErroResumoPublico[]
  /** "Copiar link do campo" copia `${urlProvedorAbsoluta}#campo-${slug}`. */
  urlProvedorAbsoluta: string
  /** De-para mostrado quando o campo é o `natOp`. */
  naturezasOperacao?: NaturezaOperacaoPublica[]
}
