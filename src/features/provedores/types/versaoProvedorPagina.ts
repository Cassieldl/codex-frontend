import type { ExemploPublico } from './exemplo'
import type { AvisoPublico } from './provedor'

export type EstadoPreenchimentoCampo = 'Obrigatorio' | 'Opcional' | 'Condicional'

/** `analise-backend.md` §4.3 — DTO composto de exibição (não viola R3). */
export interface CampoVersaoPublico {
  campoLayoutSlug: string
  nome: string
  caminhoXml: string
  significado: string
  /** Campo criado pela reforma tributária (IBS/CBS), do vocabulário do layout. */
  reformaTributaria: boolean
  tipo: string
  tamanho: string | null
  mascara: string | null
  dominio: string | null
  estadoPreenchimento: EstadoPreenchimentoCampo
  condicao: string | null
  exemplo: string | null
  notaPreenchimento: string | null
  destinoXml: string | null
  notaTransformacao: string | null
  ordem: number
  /**
   * Rejeições já registradas sobre este campo nesta versão. Sempre presente — `[]` quando não há
   * nenhuma, nunca ausente.
   */
  errosConhecidos: ErroDoCampo[]
}

/** Referência mínima do erro para o indicador da linha: o bastante para rotular e linkar. */
export interface ErroDoCampo {
  slug: string
  codigo: string
}

export interface GrupoCampoVersao {
  grupo: string | null
  grupoSlug: string | null
  campos: CampoVersaoPublico[]
}

/** Uma linha do de-para da natureza da operação. */
export interface NaturezaOperacaoPublica {
  codigoInvoicy: number
  descricao: string
  valorProvedor: string
  observacao: string | null
  /** Conversão ainda não confirmada na fonte. */
  aConfirmar: boolean
}

/** Item de `errosResumo.itens` — o link é montado com o `slug`, pela rota do erro. */
export interface ErroResumoPublico {
  slug: string
  codigo: string
  titulo: string
  /**
   * Mensagens observadas, como o provedor as devolve. É por elas que o leitor reconhece o próprio
   * caso — ele chega com o texto da prefeitura em mãos, não com o código nem com o nosso título.
   * Sempre presente; `[]` quando o erro ainda não tem variante registrada.
   */
  variantes: string[]
}

/**
 * `GET /provedores/{provedorSlug}/versoes/{versaoSlug}` (P4) — agregado único
 * da tela mais densa do portal (`analise-backend.md` §4.3). `avisos` aqui é
 * **só de versão** — os de provedor vivem em `ProvedorDetalhe` e nunca são
 * duplicados neste tipo (U8).
 */
export interface VersaoProvedorPagina {
  provedor: {
    slug: string
    nome: string
    categoria: 'Nacional' | 'Proprio'
    identificadorInvoicy: string
  }
  versao: {
    slug: string
    rotulo: string
    verificadoEm: string | null
    introducao: string | null
    versaoLayoutRotulo: string
  }
  camposPorGrupo: GrupoCampoVersao[]
  totalCampos: number
  avisos: AvisoPublico[]
  errosResumo: { total: number; itens: ErroResumoPublico[] }
  /** Cenários de XML da versão (C4) — **sempre presente**, `[]` quando não há nenhum. */
  exemplos: ExemploPublico[]
  /** De-para do `natOp` do InvoiCy para o valor no layout do provedor. Sempre presente, `[]` sem tabela. */
  naturezasOperacao: NaturezaOperacaoPublica[]
  outrasVersoes: { slug: string; rotulo: string }[]
}
