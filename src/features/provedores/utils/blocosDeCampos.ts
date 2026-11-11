import type { EstadoPreenchimento } from '../../../components/ui/EtiquetaEstado'
import {
  agruparEmBlocos,
  filtrarBlocos,
  normalizarParaBusca,
  sequenciaDosBlocos,
} from '../../../utils/blocosDoLayout'
import type {
  BlocoDoLayout,
  CampoNaSequencia as CampoNaSequenciaDoLayout,
  SubgrupoDoLayout,
} from '../../../utils/blocosDoLayout'
import type {
  CampoVersaoPublico,
  EstadoPreenchimentoCampo,
  GrupoCampoVersao,
} from '../types/versaoProvedorPagina'

export type FiltroDeEstado = 'todos' | EstadoPreenchimentoCampo

export interface FiltroDeCampos {
  estado: FiltroDeEstado
  termo: string
  somenteReformaTributaria: boolean
}

export function filtroDeCamposAtivo({
  estado,
  termo,
  somenteReformaTributaria,
}: FiltroDeCampos): boolean {
  return estado !== 'todos' || somenteReformaTributaria || termo.trim() !== ''
}

export type SubgrupoDeCampos = SubgrupoDoLayout<CampoVersaoPublico>

export type CampoNaSequencia = CampoNaSequenciaDoLayout<CampoVersaoPublico>

export interface BlocoDeCampos extends BlocoDoLayout<CampoVersaoPublico> {
  /** Obrigatórios do bloco, sem filtro. */
  obrigatoriosDoBloco: number
}

export const ESTADO_PARA_ETIQUETA: Record<EstadoPreenchimentoCampo, EstadoPreenchimento> = {
  Obrigatorio: 'obrigatorio',
  Opcional: 'opcional',
  Condicional: 'condicional',
}

function contarObrigatorios(subgrupos: SubgrupoDeCampos[]): number {
  return subgrupos.reduce(
    (soma, subgrupo) =>
      soma + subgrupo.campos.filter((campo) => campo.estadoPreenchimento === 'Obrigatorio').length,
    0,
  )
}

/** Agrupa os grupos da API em blocos por raiz, na ordem da primeira aparição. */
export function montarBlocos(camposPorGrupo: GrupoCampoVersao[]): BlocoDeCampos[] {
  return agruparEmBlocos(camposPorGrupo).map((bloco) => ({
    ...bloco,
    obrigatoriosDoBloco: contarObrigatorios(bloco.subgrupos),
  }))
}

export function campoPassaNoFiltro(campo: CampoVersaoPublico, filtro: FiltroDeCampos): boolean {
  if (filtro.estado !== 'todos' && campo.estadoPreenchimento !== filtro.estado) return false
  if (filtro.somenteReformaTributaria && !campo.reformaTributaria) return false

  const termo = normalizarParaBusca(filtro.termo)
  if (termo === '') return true

  return [campo.nome, campo.caminhoXml, campo.destinoXml ?? ''].some((texto) =>
    normalizarParaBusca(texto).includes(termo),
  )
}

/** Mantém todos os blocos; só os campos (e subgrupos sem campo) saem. */
export function filtrarCampos(blocos: BlocoDeCampos[], filtro: FiltroDeCampos): BlocoDeCampos[] {
  const filtrados = filtrarBlocos(blocos, (campo) => campoPassaNoFiltro(campo, filtro))

  // `filtrarBlocos` devolve todos os blocos na mesma ordem: o índice recupera o tipo com os totais do bloco original.
  return filtrados.map((bloco, indice) => ({ ...blocos[indice], ...bloco }))
}

/** Campos visíveis na ordem do DOM: bloco, subgrupo, campo. */
export function sequenciaVisivel(blocos: BlocoDeCampos[]): CampoNaSequencia[] {
  return sequenciaDosBlocos(blocos)
}

/** Conta a versão inteira, sem considerar o termo de busca. */
/** Campos da reforma tributária na versão inteira, sem considerar nenhum filtro. */
export function contarDaReformaTributaria(camposPorGrupo: GrupoCampoVersao[]): number {
  return camposPorGrupo.reduce(
    (soma, grupo) => soma + grupo.campos.filter((campo) => campo.reformaTributaria).length,
    0,
  )
}

export function contarPorEstado(
  camposPorGrupo: GrupoCampoVersao[],
): Record<FiltroDeEstado, number> {
  const contagem: Record<FiltroDeEstado, number> = {
    todos: 0,
    Obrigatorio: 0,
    Opcional: 0,
    Condicional: 0,
  }

  for (const grupo of camposPorGrupo) {
    for (const campo of grupo.campos) {
      contagem.todos += 1
      contagem[campo.estadoPreenchimento] += 1
    }
  }

  return contagem
}
