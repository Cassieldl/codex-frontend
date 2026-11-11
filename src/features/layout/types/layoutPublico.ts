// Espelha `arquitetura.md` §4.1 (P10/P11/P12).

import type { EstadoPreenchimentoCampo } from '../../provedores/types/versaoProvedorPagina'

export type EstadoVersaoLayout = 'Prevista' | 'Vigente' | 'Anterior'

export interface LayoutVersaoResumo {
  slug: string
  rotulo: string
  estado: EstadoVersaoLayout
  ordem: number
  totalCampos: number
}

/** O que a vigente mudou em relação à anterior publicada. */
export interface NovidadesVersaoLayout {
  versao: LayoutVersaoResumo
  anterior: LayoutVersaoResumo | null
  descricao: string | null
  camposNovos: number
  camposDescontinuados: number
}

export interface LayoutIndice {
  vigente: LayoutVersaoResumo | null
  /** Já ordenado por `ordem` DESC pelo backend — o frontend nunca reordena. */
  versoes: LayoutVersaoResumo[]
  /** `null` sem versão vigente publicada. */
  novidades: NovidadesVersaoLayout | null
}

export interface CampoLayoutPublico {
  slug: string
  nome: string
  caminhoXml: string
  significado: string
  ordem: number
  /** Campo criado pela reforma tributária (IBS/CBS), como o InvoiCy marca na planilha do layout. */
  reformaTributaria: boolean
  novoNestaVersao: boolean
  descontinuadoNestaVersao: boolean
  /** "/layout/campos/{slug}" — fonte única do link estável do campo (A3). */
  urlCanonica: string
}

export interface GrupoCamposLayout {
  grupo: string | null
  grupoSlug: string | null
  campos: CampoLayoutPublico[]
}

export interface LayoutVersaoPagina {
  // `descricao` é IRMÃ de `versao`, não aninhada: o `LayoutVersaoDto` do backend tem as duas no
  // mesmo nível, e `LayoutVersaoResumoDto` não carrega o campo — ele é reusado em `anterior`,
  // `versaoExibicao`, `versaoOrigem` e no índice, onde uma nota de versão não faria sentido.
  versao: LayoutVersaoResumo
  descricao: string | null
  anterior: LayoutVersaoResumo | null
  totalCampos: number
  camposPorGrupo: GrupoCamposLayout[]
}

/** Uso do campo por uma versão de provedor, já validado (`useUsosDoCampoLayout`). */
export interface UsoCampoLayout {
  provedorSlug: string
  provedorNome: string
  versaoSlug: string
  /** Rótulo da versão DO PROVEDOR ("2.04"), não o do layout. */
  versaoRotulo: string
  /** `null` quando o provedor não tem destino; " | " entre destinos e "…" nos omitidos. */
  destinoXml: string | null
  estadoPreenchimento: EstadoPreenchimentoCampo
}

/**
 * Uso como chega da rede. As duas últimas chaves são obrigatórias no contrato, mas só o
 * `useUsosDoCampoLayout` as exige: a resolução do campo ignora `ondeEUsado`.
 */
export type UsoCampoLayoutRecebido = Omit<UsoCampoLayout, 'destinoXml' | 'estadoPreenchimento'> &
  Partial<Pick<UsoCampoLayout, 'destinoXml' | 'estadoPreenchimento'>>

/**
 * Resposta de P12. Tem dois consumidores: a resolução do campo, que só lê `versaoExibicao` e
 * ignora `ondeEUsado` (F-2), e o modal do campo, que lista os usos.
 */
export interface CampoLayoutVerbete {
  slug: string
  nome: string
  caminhoXml: string
  significado: string
  reformaTributaria: boolean
  estado: 'Ativo' | 'Descontinuado'
  versaoExibicao: { slug: string; rotulo: string }
  versaoOrigem: { slug: string; rotulo: string }
  versaoDescontinuado: { slug: string; rotulo: string } | null
  ondeEUsado: UsoCampoLayoutRecebido[]
}
