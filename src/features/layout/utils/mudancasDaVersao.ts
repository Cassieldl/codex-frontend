import { TIPOS_DE_MUDANCA } from '../types/layoutPublico'
import type { MudancaDaVersaoLayout, TipoDeMudanca } from '../types/layoutPublico'

export const ROTULO_DO_TIPO_DE_MUDANCA: Record<TipoDeMudanca, string> = {
  grupoNovo: 'Grupos novos',
  campoNovo: 'Campos novos',
  mudouDeLugar: 'Mudaram de lugar',
  renomeado: 'Renomeados',
  saiu: 'Saíram',
  alterado: 'Alterados',
}

export interface GrupoDeMudancas {
  tipo: TipoDeMudanca
  rotulo: string
  mudancas: MudancaDaVersaoLayout[]
}

/** Campo do dicionário que uma mudança pode citar: caminho para casar, slug para o link. */
export interface CampoCitavel {
  slug: string
  caminhoXml: string
}

/** Grupos na ordem fixa da tela, sem os vazios; tipo que a tela não conhece fica de fora. */
export function agruparMudancas(mudancas: readonly MudancaDaVersaoLayout[]): GrupoDeMudancas[] {
  return TIPOS_DE_MUDANCA.map((tipo) => ({
    tipo,
    rotulo: ROTULO_DO_TIPO_DE_MUDANCA[tipo],
    mudancas: mudancas.filter((mudanca) => mudanca.tipo === tipo),
  })).filter((grupo) => grupo.mudancas.length > 0)
}

export type ChaveDoContador = 'novos' | 'descontinuados' | 'mudaramDeLugar' | 'renomeados'

export interface ContadorDeMudanca {
  chave: ChaveDoContador
  /** Quantos itens a lista logo abaixo mostra. */
  quantidade: number
  /** Campos do dicionário afetados, só quando diferem da quantidade. */
  camposAfetados: number | null
}

/** Campos marcados no dicionário como novos e como descontinuados nesta versão. */
export interface CamposMarcados {
  novos: number
  descontinuados: number
}

function contarDosTipos(
  mudancas: readonly MudancaDaVersaoLayout[],
  ...tipos: TipoDeMudanca[]
): number {
  return mudancas.filter((mudanca) => tipos.includes(mudanca.tipo)).length
}

/**
 * Os contadores do "O que mudou". O número conta os itens da lista que a tela mostra: as mudanças
 * estruturadas, ou os chips de campos quando a versão não tem. Os campos marcados no dicionário
 * incluem os filhos de grupo novo e o caminho antigo do que mudou de lugar, e entram como detalhe.
 */
export function contarMudancasDaVersao(
  mudancas: readonly MudancaDaVersaoLayout[],
  camposMarcados: CamposMarcados,
): ContadorDeMudanca[] {
  const semLista = mudancas.length === 0

  function comDetalhe(chave: ChaveDoContador, naLista: number, marcados: number) {
    const quantidade = semLista ? marcados : naLista
    const camposAfetados = marcados > 0 && marcados !== quantidade ? marcados : null
    return { chave, quantidade, camposAfetados }
  }

  const contadores: ContadorDeMudanca[] = [
    comDetalhe('novos', contarDosTipos(mudancas, 'grupoNovo', 'campoNovo'), camposMarcados.novos),
    comDetalhe('descontinuados', contarDosTipos(mudancas, 'saiu'), camposMarcados.descontinuados),
    {
      chave: 'mudaramDeLugar',
      quantidade: contarDosTipos(mudancas, 'mudouDeLugar'),
      camposAfetados: null,
    },
    {
      chave: 'renomeados',
      quantidade: contarDosTipos(mudancas, 'renomeado'),
      camposAfetados: null,
    },
  ]

  return contadores.filter((contador) => contador.quantidade > 0)
}

export interface CampoDoChip {
  slug: string
  nome: string
  caminhoXml: string
}

function pontaDoCaminho(caminhoXml: string, segmentos: number): string {
  return caminhoXml.split('/').filter(Boolean).slice(-segmentos).join('/')
}

/**
 * Rótulo de cada chip de campo: o nome, ou a ponta do caminho quando o nome se repete na lista. O
 * campo que mudou de grupo aparece como novo e como descontinuado com o mesmo nome; só o caminho
 * diz qual é qual. A ponta cresce até separar os repetidos.
 */
export function rotulosDosChips(campos: readonly CampoDoChip[]): Map<string, string> {
  const porNome = new Map<string, CampoDoChip[]>()
  for (const campo of campos) porNome.set(campo.nome, [...(porNome.get(campo.nome) ?? []), campo])

  const rotulos = new Map<string, string>()
  for (const [nome, mesmoNome] of porNome) {
    if (mesmoNome.length === 1) {
      rotulos.set(mesmoNome[0].slug, nome)
      continue
    }

    const maiorCaminho = Math.max(
      ...mesmoNome.map((campo) => campo.caminhoXml.split('/').filter(Boolean).length),
    )
    let segmentos = 2
    while (
      segmentos < maiorCaminho &&
      new Set(mesmoNome.map((campo) => pontaDoCaminho(campo.caminhoXml, segmentos))).size <
        mesmoNome.length
    ) {
      segmentos++
    }
    for (const campo of mesmoNome) {
      rotulos.set(campo.slug, pontaDoCaminho(campo.caminhoXml, segmentos))
    }
  }

  return rotulos
}

/** "Alterado" com o mesmo caminho dos dois lados: a seta sugeriria uma mudança de lugar. */
export function caminhoNaoMudou(mudanca: MudancaDaVersaoLayout): boolean {
  const antes = mudanca.antes?.trim() ?? ''
  return antes !== '' && antes === (mudanca.depois?.trim() ?? '')
}

function semBarrasNasPontas(caminho: string): string {
  return caminho.replace(/^\/+|\/+$/g, '')
}

/** Caminho com reticências é um resumo do texto, não uma tag: não aponta para campo nenhum. */
function ehCaminhoResumido(caminho: string): boolean {
  return caminho.includes('...') || caminho.includes('…')
}

/**
 * Slug do campo que o texto cita, ou `null` quando não há um só candidato. Casa o caminho
 * inteiro; sem isso, um caminho que termina no texto citado ("nroDUIMP" ou "Valores/nroDUIMP").
 * Dois candidatos ou nenhum não viram link: a tela não escolhe por conta própria.
 */
export function resolverCampoCitado(
  citado: string | null,
  campos: readonly CampoCitavel[],
): string | null {
  if (!citado) return null
  const alvo = semBarrasNasPontas(citado.trim())
  if (!alvo || ehCaminhoResumido(alvo) || /\s/.test(alvo)) return null

  const exato = campos.filter((campo) => semBarrasNasPontas(campo.caminhoXml) === alvo)
  if (exato.length === 1) return exato[0].slug
  if (exato.length > 1) return null

  const pelaPonta = campos.filter((campo) =>
    `/${semBarrasNasPontas(campo.caminhoXml)}`.endsWith(`/${alvo}`),
  )
  return pelaPonta.length === 1 ? pelaPonta[0].slug : null
}

/** O campo da mudança é o de depois; só o que saiu aponta para o de antes. */
export function campoDaMudanca(
  mudanca: MudancaDaVersaoLayout,
  campos: readonly CampoCitavel[],
): string | null {
  const citado = mudanca.tipo === 'saiu' ? mudanca.antes : mudanca.depois
  return resolverCampoCitado(citado, campos)
}
