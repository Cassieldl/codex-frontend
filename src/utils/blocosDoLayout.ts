/** Grupo de campos como a API entrega: `grupo` é o caminho com barras ("Servico/Valores"). */
export interface GrupoDeCampos<TCampo> {
  grupo: string | null
  grupoSlug: string | null
  campos: TCampo[]
}

export interface SubgrupoDoLayout<TCampo> {
  /** `grupoSlug ?? grupo ?? 'sem-grupo'`. */
  chave: string
  /** Vira `id="grupo-{grupoSlug}"`. */
  grupoSlug: string | null
  /** "Valores › IBSCBS", "Campos gerais" ou `null` quando o bloco tem um subgrupo só. */
  titulo: string | null
  campos: TCampo[]
}

export interface BlocoDoLayout<TCampo> {
  /** Primeiro segmento do grupo; `'outros'` quando o campo não tem grupo. */
  raiz: string
  rotulo: string
  subgrupos: SubgrupoDoLayout<TCampo>[]
  /** Total do bloco, sem filtro. */
  totalDoBloco: number
  /** Soma dos campos dos subgrupos, já com o filtro aplicado. */
  totalVisivel: number
}

export interface CampoNaSequencia<TCampo> {
  campo: TCampo
  raiz: string
  trilha: string
}

const RAIZ_SEM_GRUPO = 'outros'
const ROTULO_SEM_GRUPO = 'Outros campos'
const TITULO_DO_SUBGRUPO_RAIZ = 'Campos gerais'
const CHAVE_SEM_GRUPO = 'sem-grupo'

export const SEPARADOR_DA_TRILHA = ' › '

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

function contarCampos<TCampo>(subgrupos: SubgrupoDoLayout<TCampo>[]): number {
  return subgrupos.reduce((soma, subgrupo) => soma + subgrupo.campos.length, 0)
}

interface SubgrupoEmMontagem<TCampo> {
  grupo: string | null
  subgrupo: SubgrupoDoLayout<TCampo>
}

/** Agrupa os grupos da API em blocos por raiz, na ordem da primeira aparição. */
export function agruparEmBlocos<TCampo>(grupos: GrupoDeCampos<TCampo>[]): BlocoDoLayout<TCampo>[] {
  const subgruposPorRaiz = new Map<string, SubgrupoEmMontagem<TCampo>[]>()

  for (const grupoDaApi of grupos) {
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
      totalVisivel: contarCampos(subgrupos),
    }
  })
}

/** Mantém todos os blocos; só os campos (e subgrupos sem campo) saem. */
export function filtrarBlocos<TCampo>(
  blocos: BlocoDoLayout<TCampo>[],
  passa: (campo: TCampo) => boolean,
): BlocoDoLayout<TCampo>[] {
  return blocos.map((bloco) => {
    const subgrupos = bloco.subgrupos
      .map((subgrupo) => ({ ...subgrupo, campos: subgrupo.campos.filter((campo) => passa(campo)) }))
      .filter((subgrupo) => subgrupo.campos.length > 0)

    return { ...bloco, subgrupos, totalVisivel: contarCampos(subgrupos) }
  })
}

/** Campos visíveis na ordem do DOM: bloco, subgrupo, campo. */
export function sequenciaDosBlocos<TCampo>(
  blocos: BlocoDoLayout<TCampo>[],
): CampoNaSequencia<TCampo>[] {
  return blocos.flatMap((bloco) =>
    bloco.subgrupos.flatMap((subgrupo) => {
      const trilha = subgrupo.titulo
        ? `${bloco.rotulo}${SEPARADOR_DA_TRILHA}${subgrupo.titulo}`
        : bloco.rotulo
      return subgrupo.campos.map((campo) => ({ campo, raiz: bloco.raiz, trilha }))
    }),
  )
}
