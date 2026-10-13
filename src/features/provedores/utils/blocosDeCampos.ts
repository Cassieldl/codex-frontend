import type { EstadoPreenchimento } from '../../../components/ui/EtiquetaEstado'
import type {
  CampoVersaoPublico,
  EstadoPreenchimentoCampo,
  GrupoCampoVersao,
} from '../types/versaoProvedorPagina'

export type FiltroDeEstado = 'todos' | EstadoPreenchimentoCampo

export interface FiltroDeCampos {
  estado: FiltroDeEstado
  termo: string
}

export interface SubgrupoDeCampos {
  /** `grupoSlug ?? grupo ?? 'sem-grupo'`. */
  chave: string
  /** Vira `id="grupo-{grupoSlug}"`. */
  grupoSlug: string | null
  /** "Valores › IBSCBS", "Campos gerais" ou `null` quando o bloco tem um subgrupo só. */
  titulo: string | null
  campos: CampoVersaoPublico[]
}

export interface BlocoDeCampos {
  /** Primeiro segmento do grupo; `'outros'` quando o campo não tem grupo. */
  raiz: string
  rotulo: string
  subgrupos: SubgrupoDeCampos[]
  /** Total do bloco, sem filtro. */
  totalDoBloco: number
  /** Obrigatórios do bloco, sem filtro. */
  obrigatoriosDoBloco: number
  /** Soma dos campos dos subgrupos, já com o filtro aplicado. */
  totalVisivel: number
}

export interface CampoNaSequencia {
  campo: CampoVersaoPublico
  raiz: string
  trilha: string
}

const RAIZ_SEM_GRUPO = 'outros'
const ROTULO_SEM_GRUPO = 'Outros campos'
const TITULO_DO_SUBGRUPO_RAIZ = 'Campos gerais'
const CHAVE_SEM_GRUPO = 'sem-grupo'
const SEPARADOR_DA_TRILHA = ' › '

export const ROTULOS_DE_BLOCO: Record<string, string> = {
  Envio: 'Dados do envio',
  RPS: 'RPS (identificação)',
  Prestador: 'Prestador',
  ListaItens: 'Itens',
  ListaParcelas: 'Parcelas',
  Servico: 'Serviço',
  Tomador: 'Tomador',
  IntermServico: 'Intermediário',
  Destinatario: 'Destinatário',
  ConstCivil: 'Construção civil',
  ListaDed: 'Deduções',
  Transportadora: 'Transportadora',
  Locacao: 'Locação',
  AtividadeEvento: 'Evento',
  Pedagio: 'Pedágio',
  Imovel: 'Imóvel',
  ListaDocumentos: 'Documentos',
  ListaNFSeReferenciadas: 'NFS-e referenciadas',
  ListaBensMoveis: 'Bens móveis',
  ListaDedIBSCBS: 'Deduções IBS/CBS',
  ListaNFSeRefPagAntecipado: 'NFS-e de pagamento antecipado',
  ListaPagamentoVinculado: 'Pagamento vinculado',
}

export const ESTADO_PARA_ETIQUETA: Record<EstadoPreenchimentoCampo, EstadoPreenchimento> = {
  Obrigatorio: 'obrigatorio',
  Opcional: 'opcional',
  Condicional: 'condicional',
}

/** Minúsculo, sem diacríticos e sem espaços nas pontas. */
export function normalizarParaBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function raizDoGrupo(grupo: string | null): string {
  if (!grupo) return RAIZ_SEM_GRUPO
  return grupo.split('/')[0]
}

function rotuloDaRaiz(raiz: string): string {
  if (raiz === RAIZ_SEM_GRUPO) return ROTULO_SEM_GRUPO
  return ROTULOS_DE_BLOCO[raiz] ?? raiz
}

function tituloDoSubgrupo(grupo: string | null, raiz: string, blocoTemVariosSubgrupos: boolean) {
  if (!grupo || grupo === raiz) {
    return grupo && blocoTemVariosSubgrupos ? TITULO_DO_SUBGRUPO_RAIZ : null
  }
  return grupo.split('/').slice(1).join(SEPARADOR_DA_TRILHA)
}

function contarCampos(subgrupos: SubgrupoDeCampos[]): number {
  return subgrupos.reduce((soma, subgrupo) => soma + subgrupo.campos.length, 0)
}

function contarObrigatorios(subgrupos: SubgrupoDeCampos[]): number {
  return subgrupos.reduce(
    (soma, subgrupo) =>
      soma + subgrupo.campos.filter((campo) => campo.estadoPreenchimento === 'Obrigatorio').length,
    0,
  )
}

interface SubgrupoEmMontagem {
  grupo: string | null
  subgrupo: SubgrupoDeCampos
}

/** Agrupa os grupos da API em blocos por raiz, na ordem da primeira aparição. */
export function montarBlocos(camposPorGrupo: GrupoCampoVersao[]): BlocoDeCampos[] {
  const subgruposPorRaiz = new Map<string, SubgrupoEmMontagem[]>()

  for (const grupoDaApi of camposPorGrupo) {
    const grupo = grupoDaApi.grupo || null
    const raiz = raizDoGrupo(grupo)
    const chave = grupoDaApi.grupoSlug ?? grupo ?? CHAVE_SEM_GRUPO
    const subgrupos = subgruposPorRaiz.get(raiz) ?? []
    const existente = subgrupos.find((item) => item.subgrupo.chave === chave)

    if (existente) {
      existente.subgrupo.campos.push(...grupoDaApi.campos)
    } else {
      subgrupos.push({
        grupo,
        subgrupo: {
          chave,
          grupoSlug: grupoDaApi.grupoSlug,
          titulo: null,
          campos: [...grupoDaApi.campos],
        },
      })
    }
    subgruposPorRaiz.set(raiz, subgrupos)
  }

  return [...subgruposPorRaiz.entries()].map(([raiz, emMontagem]) => {
    const subgrupos = emMontagem.map(({ grupo, subgrupo }) => ({
      ...subgrupo,
      titulo: tituloDoSubgrupo(grupo, raiz, emMontagem.length > 1),
    }))

    return {
      raiz,
      rotulo: rotuloDaRaiz(raiz),
      subgrupos,
      totalDoBloco: contarCampos(subgrupos),
      obrigatoriosDoBloco: contarObrigatorios(subgrupos),
      totalVisivel: contarCampos(subgrupos),
    }
  })
}

export function campoPassaNoFiltro(campo: CampoVersaoPublico, filtro: FiltroDeCampos): boolean {
  if (filtro.estado !== 'todos' && campo.estadoPreenchimento !== filtro.estado) return false

  const termo = normalizarParaBusca(filtro.termo)
  if (termo === '') return true

  return [campo.nome, campo.caminhoXml, campo.destinoXml ?? ''].some((texto) =>
    normalizarParaBusca(texto).includes(termo),
  )
}

/** Mantém todos os blocos; só os campos (e subgrupos sem campo) saem. */
export function filtrarCampos(blocos: BlocoDeCampos[], filtro: FiltroDeCampos): BlocoDeCampos[] {
  return blocos.map((bloco) => {
    const subgrupos = bloco.subgrupos
      .map((subgrupo) => ({
        ...subgrupo,
        campos: subgrupo.campos.filter((campo) => campoPassaNoFiltro(campo, filtro)),
      }))
      .filter((subgrupo) => subgrupo.campos.length > 0)

    return { ...bloco, subgrupos, totalVisivel: contarCampos(subgrupos) }
  })
}

/** Campos visíveis na ordem do DOM: bloco, subgrupo, campo. */
export function sequenciaVisivel(blocos: BlocoDeCampos[]): CampoNaSequencia[] {
  return blocos.flatMap((bloco) =>
    bloco.subgrupos.flatMap((subgrupo) => {
      const trilha = subgrupo.titulo
        ? `${bloco.rotulo}${SEPARADOR_DA_TRILHA}${subgrupo.titulo}`
        : bloco.rotulo
      return subgrupo.campos.map((campo) => ({ campo, raiz: bloco.raiz, trilha }))
    }),
  )
}

/** Conta a versão inteira, sem considerar o termo de busca. */
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
