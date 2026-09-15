// Espelha `analise-frontend.md` §5.5, que por sua vez segue o contrato real
// de `GET /busca` (P1, `analise-backend.md` §4.1/§6) — `ApiResponse<ResultadoBusca>`.
// Usado tanto pela busca pública (`apiPublico`, este arquivo) quanto pela busca
// interna (M15/M21, hook próprio em `features/interno/busca`, mesmo tipo).

export type QualidadeBusca = 'exata' | 'parcial' | 'aproximada' | 'vazia'

export type TipoResultado =
  'erro' | 'provedor' | 'versaoProvedor' | 'campoLayout' | 'aviso' | 'artigo'

export interface TrechoResultado {
  texto: string
  destacado: boolean
}

/** Metadado estruturado do item (P-12) — o frontend formata para português no ponto de uso. */
export interface MetaVerificacaoResultado {
  tipo: 'verificacao'
  data: string
}

export type MetaResultado = MetaVerificacaoResultado

/**
 * Cada token que a autocorreção trocou (ex.: `{ original: 'invoicy', corrigido: 'InvoiCy' }`).
 * O contrato exato ainda não foi fechado pelo Analista Backend — a UI desta unidade só
 * consome `termoOriginal`/`termoCorrigido` (ver `BlocoAutocorrecao`), nunca `tokens`.
 */
export interface TokenCorrecao {
  original: string
  corrigido: string
}

export interface CorrecaoBusca {
  termoOriginal: string
  termoCorrigido: string
  tokens: TokenCorrecao[]
}

export interface ResultadoItem {
  tipo: string
  rotulo: string
  chave: string | null
  titulo: string
  url: string
  /** `null` para erro geral (U9) — sem provedor/versão aplicável. Ver `ResultadoErroGeral`. */
  provedorNome: string | null
  versaoRotulo: string | null
  versoes: string[] | null
  /** Ex.: "casou com o código E-124" (P1/I21 — movido de `GrupoResultado`, agora por item). */
  descricaoCasamento: string
  /** Em `apiPublico` (P1) sempre `true` por construção; em `apiInterno` (I21) revela rascunho. */
  publicado: boolean
  meta: MetaResultado | null
  pontuacao: number
  /** Fragmentos estruturados (D11) — nunca HTML. Renderizado por `TrechosDestacados`. */
  trechos: TrechoResultado[]
}

export interface GrupoResultado {
  tipo: TipoResultado
  rotulo: string
  total: number
  pontuacao: number
  itens: ResultadoItem[]
}

export interface ForaDoFiltro {
  total: number
  tipos: string[]
}

export interface FiltroProvedor {
  slug: string
  nome: string
}

export interface ResultadoBusca {
  termo: string
  termoUsado: string
  correcao: CorrecaoBusca | null
  qualidade: QualidadeBusca
  totalGeral: number
  /** Já vem ordenado por `pontuacao` — o frontend nunca reordena. */
  grupos: GrupoResultado[]
  foraDoFiltro: ForaDoFiltro | null
  filtroProvedor: FiltroProvedor | null
}
