import type { ExemploPublico } from './exemplo'
import type { AvisoPublico } from './provedor'

export type EstadoPreenchimentoCampo = 'Obrigatorio' | 'Opcional' | 'Condicional'

/** `analise-backend.md` §4.3 — DTO composto de exibição (não viola R3). */
export interface CampoVersaoPublico {
  campoLayoutSlug: string
  nome: string
  caminhoXml: string
  significado: string
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
}

export interface GrupoCampoVersao {
  grupo: string | null
  grupoSlug: string | null
  campos: CampoVersaoPublico[]
}

/** Item de `errosResumo.itens` — shape mínimo para link + título (top 20 por relevância). */
export interface ErroResumoPublico {
  codigo: string
  titulo: string
  url: string
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
  outrasVersoes: { slug: string; rotulo: string }[]
}
