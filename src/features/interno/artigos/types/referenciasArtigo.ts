import type { CampoLayoutVinculadoArtigo, ErroVinculadoArtigo } from './artigoAdmin'

/** Busca de erros no servidor que alimenta o formulário de artigo. */
export interface BuscaDeErrosDoArtigo {
  termo: string
  onTermoChange: (termo: string) => void
  resultados: ErroVinculadoArtigo[]
  /** Total de erros que casam com o termo, para avisar quando a lista mostra só o começo. */
  totalEncontrado: number
  isBuscando: boolean
  isError: boolean
}

export interface VersaoLayoutDoArtigo {
  id: number
  rotulo: string
}

/** Campos do layout de uma versão escolhida no formulário de artigo. */
export interface CamposLayoutDoArtigo {
  versoes: VersaoLayoutDoArtigo[]
  versaoSelecionadaId: number | null
  onVersaoChange: (versaoLayoutId: number) => void
  campos: CampoLayoutVinculadoArtigo[]
  isLoading: boolean
  isError: boolean
}
