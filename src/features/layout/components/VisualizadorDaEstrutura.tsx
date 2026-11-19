import clsx from 'clsx'
import { ChevronsDownUp, ChevronsUpDown, Download } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { LegendaDeMarcas } from '../../../components/ui/LegendaDeMarcas'
import type { ItemDaLegendaDeMarcas } from '../../../components/ui/LegendaDeMarcas'
import { SeloReformaTributaria } from '../../../components/ui/SeloReformaTributaria'
import type { VizinhoDeCampo } from '../../../types/vizinhoDeCampo'
import { baixarArquivoDeTexto } from '../../../utils/baixarArquivoDeTexto'
import type { CampoNaSequencia } from '../../../utils/blocosDoLayout'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import { construirIdLinhaEstrutura } from '../../provedores/utils/destaqueAncora'
import { useAncoraDaEstrutura } from '../hooks/useAncoraDaEstrutura'
import { ROTULO_DO_FORMATO } from '../types/estruturaLayout'
import type { FormatoDaEstrutura, NoEstrutura } from '../types/estruturaLayout'
import type { CampoLayoutPublico } from '../types/layoutPublico'
import type { FormatosDoCampo } from '../utils/formatosDoCampoNaEstrutura'
import { marcasDoCampoNaEstrutura } from '../utils/marcasDoCampoNaEstrutura'
import type { MarcasDoCampoNaEstrutura } from '../utils/marcasDoCampoNaEstrutura'
import type { LinhaDaEstrutura } from '../utils/linhasDaEstrutura'
import {
  gruposAbertosPorPadrao,
  montarLinhasDaEstrutura,
  textoDaLinha,
} from '../utils/linhasDaEstrutura'
import {
  CLASSE_DA_ETIQUETA_DE_MARCADOR,
  CLASSE_DA_ETIQUETA_DE_NOVO,
  LinhaDoTextoDaEstrutura,
} from './LinhaDoTextoDaEstrutura'
import type { AcaoDaTag, SuperficieDaEstrutura } from './LinhaDoTextoDaEstrutura'
import { ModalDoVerbete } from './ModalDoVerbete'

/** Página do layout: a tag abre o verbete do campo num modal, e a URL pode apontar uma tag. */
export interface DestinoNoVerbete {
  tipo: 'verbete'
  versaoSlug: string
  versaoRotulo: string
  /** Campos do dicionário da versão, com a trilha que o modal mostra. */
  camposPorSlug: ReadonlyMap<string, CampoNaSequencia<CampoLayoutPublico>>
  formatosDoCampo: FormatosDoCampo
  /** Slug apontado por `#estrutura-{slug}`, se houver. */
  slugAncora: string | null
  origemUrl: string
}

/** Página da versão do provedor: a tag leva à linha do campo na tabela da mesma página. */
export interface DestinoNaLinhaDaTabela {
  tipo: 'linhaDaTabela'
  /** Slugs de campo que têm linha na tabela; os outros ficam como texto. */
  camposDaTabela: ReadonlySet<string>
  /** Slugs dos campos da reforma tributária, que ganham o selo RT. */
  camposDaReforma: ReadonlySet<string>
}

export type DestinoDaTag = DestinoNoVerbete | DestinoNaLinhaDaTabela

export interface VisualizadorDaEstruturaProps {
  raiz: NoEstrutura
  formato: FormatoDaEstrutura
  destino: DestinoDaTag
  /** Nome do arquivo baixado, sem a extensão. */
  nomeBaseDoArquivo: string
  /** Nome acessível da região do texto (ex.: "Texto da estrutura XML (SOAP)"). */
  rotuloDaRegiao: string
  /** Nome acessível do botão de copiar (ex.: "Copiar a estrutura XML (SOAP) completa"). */
  rotuloDaCopia: string
  /** `escura`: painel de código com o nome do arquivo na barra e tag, valor e pontuação coloridos. */
  superficie?: SuperficieDaEstrutura
}

const EXTENSAO: Record<FormatoDaEstrutura, { extensao: string; mime: string }> = {
  xml: { extensao: 'xml', mime: 'application/xml' },
  json: { extensao: 'json', mime: 'application/json' },
}

const LEGENDA_DO_SUBLINHADO: Record<DestinoDaTag['tipo'], string> = {
  verbete: 'abre o verbete do campo',
  linhaDaTabela: 'abre o campo na aba Campos',
}

// A marca da legenda fica fora do painel: leva o fundo escuro junto para a cor ser a mesma.
const CLASSE_DA_AMOSTRA_NO_ESCURO =
  'inline-flex items-center rounded-[var(--radius-control)] bg-codigo-fundo px-1.5 font-mono'

const SEM_CAMPOS: ReadonlyMap<string, CampoNaSequencia<CampoLayoutPublico>> = new Map()

// Mesma caixa do botão de copiar: a barra inteira tem uma altura e um alinhamento só.
const CLASSE_DO_BOTAO_DA_BARRA =
  'inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] border border-border bg-white px-2.5 text-xs font-medium text-ink hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover'

// Ação terciária sobre o cabeçalho escuro: sem caixa, só o texto, para não disputar com Copiar e Baixar.
const CLASSE_DA_ACAO_NO_ESCURO =
  'inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-xs font-semibold text-codigo-texto underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover'

const CLASSE_DO_BAIXAR_NO_ESCURO =
  'inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] bg-accent px-3 text-xs font-bold text-primary hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover'

interface MarcasDoTexto {
  soXml: boolean
  soJson: boolean
  escolha: boolean
  novo: boolean
  reforma: boolean
  tagClicavel: boolean
}

function marcasDoTexto(linhas: readonly LinhaDaEstrutura[], destino: DestinoDaTag): MarcasDoTexto {
  const marcas: MarcasDoTexto = {
    soXml: false,
    soJson: false,
    escolha: false,
    novo: false,
    reforma: false,
    tagClicavel: false,
  }

  for (const { no } of linhas) {
    if (!no) continue
    const marcasDaTag = marcasDoCampo(destino, no.campoSlug)
    if (no.formato === 'soXml') marcas.soXml = true
    if (no.formato === 'soJson') marcas.soJson = true
    if (no.escolha) marcas.escolha = true
    if (marcasDaTag.novoNestaVersao) marcas.novo = true
    if (marcasDaTag.reformaTributaria) marcas.reforma = true
    if (acaoDaTag(destino, no.campoSlug) !== null) marcas.tagClicavel = true
  }

  return marcas
}

/** Só as marcas que aparecem neste texto entram na legenda, no desenho da tabela de campos. */
function itensDaLegenda(
  marcas: MarcasDoTexto,
  destino: DestinoDaTag['tipo'],
  marcaDeNovo: string | null,
  superficie: SuperficieDaEstrutura,
): ItemDaLegendaDeMarcas[] {
  const itens: ItemDaLegendaDeMarcas[] = []

  if (marcas.novo && marcaDeNovo !== null) {
    itens.push({
      chave: 'novo',
      marca: <span className={CLASSE_DA_ETIQUETA_DE_NOVO}>{marcaDeNovo}</span>,
      significado: 'campo novo nesta versão',
    })
  }

  if (marcas.soXml) {
    itens.push({
      chave: 'soXml',
      marca: <span className={CLASSE_DA_ETIQUETA_DE_MARCADOR}>só SOAP</span>,
      significado: 'só no envio XML',
    })
  }
  if (marcas.soJson) {
    itens.push({
      chave: 'soJson',
      marca: <span className={CLASSE_DA_ETIQUETA_DE_MARCADOR}>só REST</span>,
      significado: 'só no envio JSON',
    })
  }
  if (marcas.escolha) {
    itens.push({
      chave: 'escolha',
      marca: <span className={CLASSE_DA_ETIQUETA_DE_MARCADOR}>uma entre as opções</span>,
      significado: 'informe só uma das tags com esta marca',
    })
  }
  if (marcas.reforma) {
    itens.push({
      chave: 'reforma',
      marca: <SeloReformaTributaria />,
      significado: 'campo da reforma tributária (IBS/CBS)',
    })
  }
  if (marcas.tagClicavel) {
    itens.push({
      chave: 'tag',
      marca:
        superficie === 'escura' ? (
          <span className={CLASSE_DA_AMOSTRA_NO_ESCURO}>
            <span className="font-semibold text-codigo-tag underline decoration-dotted underline-offset-[3px]">
              sublinhado
            </span>
          </span>
        ) : (
          <span className="font-mono font-semibold text-primary-medium underline decoration-dotted underline-offset-2">
            sublinhado
          </span>
        ),
      significado: LEGENDA_DO_SUBLINHADO[destino],
    })
  }

  // Só o painel escuro pinta o valor: no claro ele é texto comum.
  if (superficie === 'escura') {
    itens.push({
      chave: 'valor',
      marca: (
        <span className={CLASSE_DA_AMOSTRA_NO_ESCURO}>
          <span className="text-codigo-valor">valor</span>
        </span>
      ),
      significado: 'exemplo: troque pelo da sua nota',
    })
  }

  return itens
}

function comGrupos(abertos: ReadonlySet<number>, grupos: readonly number[]): ReadonlySet<number> {
  if (grupos.every((grupo) => abertos.has(grupo))) return abertos
  return new Set([...abertos, ...grupos])
}

function marcasDoCampo(destino: DestinoDaTag, slug: string | null): MarcasDoCampoNaEstrutura {
  if (destino.tipo === 'verbete') return marcasDoCampoNaEstrutura(slug, destino.camposPorSlug)
  return {
    novoNestaVersao: false,
    reformaTributaria: slug !== null && destino.camposDaReforma.has(slug),
  }
}

function acaoDaTag(destino: DestinoDaTag, slug: string | null): AcaoDaTag | null {
  if (slug === null) return null
  if (destino.tipo === 'verbete') return destino.camposPorSlug.has(slug) ? 'verbete' : null
  return destino.camposDaTabela.has(slug) ? 'linhaDaTabela' : null
}

/**
 * Texto da estrutura de um formato, com grupos recolhíveis e cada tag de campo clicável. O destino
 * do clique vem de `destino`; a chegada por `#estrutura-{slug}` só existe no destino `verbete`.
 */
export function VisualizadorDaEstrutura({
  raiz,
  formato,
  destino,
  nomeBaseDoArquivo,
  rotuloDaRegiao,
  rotuloDaCopia,
  superficie = 'clara',
}: VisualizadorDaEstruturaProps) {
  const escura = superficie === 'escura'
  const contenedorRef = useRef<HTMLDivElement | null>(null)
  // Linha da tag no modal neste instante: o modal devolve o foco depois de sair do DOM, quando o
  // estado já foi limpo.
  const linhaDaTagAbertaRef = useRef<number | null>(null)

  const comVerbete = destino.tipo === 'verbete'
  const camposPorSlug = comVerbete ? destino.camposPorSlug : SEM_CAMPOS
  const slugAncora = comVerbete ? destino.slugAncora : null
  const marcaDeNovo = comVerbete ? `novo na ${formatarVersaoLayout(destino.versaoRotulo)}` : null

  const { linhas, ancoras } = useMemo(() => montarLinhasDaEstrutura(raiz, formato), [raiz, formato])
  const marcas = useMemo(() => marcasDoTexto(linhas, destino), [linhas, destino])

  const [abertos, setAbertos] = useState<ReadonlySet<number>>(() => gruposAbertosPorPadrao(linhas))
  const [slugAberto, setSlugAberto] = useState<string | null>(null)
  const [avisoDoDownload, setAvisoDoDownload] = useState('')

  const abrirGrupos = useCallback((grupos: readonly number[]) => {
    setAbertos((atuais) => comGrupos(atuais, grupos))
  }, [])

  useAncoraDaEstrutura({ slugAncora, ancoras, abrirGrupos, ativo: comVerbete })

  const alternarGrupo = useCallback((indice: number) => {
    setAbertos((atuais) => {
      const proximos = new Set(atuais)
      if (proximos.has(indice)) proximos.delete(indice)
      else proximos.add(indice)
      return proximos
    })
  }, [])

  const abrirTag = useCallback((slug: string, linha: number) => {
    linhaDaTagAbertaRef.current = linha
    setSlugAberto(slug)
  }, [])

  const sequenciaDoModal = useMemo(
    () => [...ancoras.keys()].filter((slug) => camposPorSlug.has(slug)),
    [ancoras, camposPorSlug],
  )

  function navegarParaTag(slug: string) {
    const ancora = ancoras.get(slug)
    if (!ancora) return
    setAbertos((atuais) => comGrupos(atuais, ancora.grupos))
    linhaDaTagAbertaRef.current = ancora.linha
    setSlugAberto(slug)
  }

  // O alvo é procurado só dentro do texto e só se ele ainda estiver na página: seguir um link do
  // modal troca a aba e desmonta este componente.
  const devolverFoco = useCallback(() => {
    const contenedor = contenedorRef.current
    const indice = linhaDaTagAbertaRef.current
    if (!contenedor || !contenedor.isConnected || indice === null) return

    const linha = contenedor.querySelector<HTMLElement>(`[data-linha="${indice}"]`)
    linha?.scrollIntoView({ block: 'nearest' })
    linha?.querySelector<HTMLElement>('[data-botao-da-tag]')?.focus({ preventScroll: true })
  }, [])

  // Grupos recolhidos são só leitura na tela: a cópia e o arquivo levam o texto inteiro.
  function textoCompleto() {
    return `${linhas.map(textoDaLinha).join('\n')}\n`
  }

  const { extensao, mime } = EXTENSAO[formato]
  const nomeDoArquivo = `${nomeBaseDoArquivo}.${extensao}`

  function baixar() {
    baixarArquivoDeTexto(nomeDoArquivo, textoCompleto(), mime)
    setAvisoDoDownload(`Arquivo ${nomeDoArquivo} gerado.`)
  }

  function expandirTudo() {
    setAbertos(
      new Set(linhas.flatMap((linha, indice) => (linha.fimDoGrupo !== null ? [indice] : []))),
    )
  }

  const linhaDaAncora = slugAncora === null ? null : (ancoras.get(slugAncora)?.linha ?? null)
  const nomeDaAncora =
    slugAncora === null ? null : (camposPorSlug.get(slugAncora)?.campo.nome ?? slugAncora)

  const visiveis: ReactNode[] = []
  for (let indice = 0; indice < linhas.length;) {
    const linha = linhas[indice]
    const recolhido = linha.fimDoGrupo !== null && !abertos.has(indice)
    const slug = linha.no?.campoSlug ?? null
    const ehAncora = comVerbete && slug !== null && ancoras.get(slug)?.linha === indice
    const marcasDaTag = marcasDoCampo(destino, slug)

    visiveis.push(
      <LinhaDoTextoDaEstrutura
        key={indice}
        indice={indice}
        linha={linha}
        formato={formato}
        recolhido={recolhido}
        textoDoFechamento={
          recolhido && linha.fimDoGrupo !== null ? linhas[linha.fimDoGrupo].prefixo : null
        }
        idDaAncora={ehAncora ? construirIdLinhaEstrutura(slug) : null}
        destacada={indice === linhaDaAncora}
        acaoDaTag={acaoDaTag(destino, slug)}
        daReformaTributaria={marcasDaTag.reformaTributaria}
        marcaDeNovo={marcasDaTag.novoNestaVersao ? marcaDeNovo : null}
        onAlternarGrupo={alternarGrupo}
        onAbrirTag={abrirTag}
        superficie={superficie}
      />,
    )

    indice = recolhido && linha.fimDoGrupo !== null ? linha.fimDoGrupo + 1 : indice + 1
  }

  const itemAberto = slugAberto ? camposPorSlug.get(slugAberto) : undefined
  const posicaoNoModal = slugAberto ? sequenciaDoModal.indexOf(slugAberto) : -1

  function vizinho(posicao: number): VizinhoDeCampo | null {
    const slug = posicaoNoModal >= 0 ? sequenciaDoModal[posicao] : undefined
    const campo = slug ? camposPorSlug.get(slug)?.campo : undefined
    return campo ? { slug: campo.slug, nome: campo.nome } : null
  }

  const legenda = (
    <LegendaDeMarcas itens={itensDaLegenda(marcas, destino.tipo, marcaDeNovo, superficie)} />
  )

  const avisoDaAncora = slugAncora !== null && linhaDaAncora === null && (
    <p
      role="status"
      className="rounded-[var(--radius-control)] border border-alert-info-borda bg-alert-info px-3 py-2 text-sm text-ink"
    >
      {nomeDaAncora} não aparece na estrutura {ROTULO_DO_FORMATO[formato]} desta versão.
    </p>
  )

  const avisoDoArquivo = (
    <span role="status" aria-live="polite" className="sr-only">
      {avisoDoDownload}
    </span>
  )

  const texto = (
    <div
      ref={contenedorRef}
      role="region"
      aria-label={rotuloDaRegiao}
      // Região rolável na horizontal precisa ser alcançável pelo teclado.
      tabIndex={0}
      // `relative` prende o `sr-only` absoluto dos marcadores dentro da rolagem: sem ele, estoura a página.
      className={clsx(
        'relative overflow-x-auto font-mono text-[13px] leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover',
        escura
          ? 'bg-codigo-fundo py-4'
          : 'rounded-[var(--radius-card)] border border-border bg-white py-3',
      )}
    >
      {visiveis}
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {escura ? (
        <>
          {avisoDaAncora}

          <div className="overflow-hidden rounded-[var(--radius-card)] bg-codigo-fundo">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/10 bg-primary px-4 py-3">
              <span data-nome-do-arquivo="" className="text-[13px] font-semibold text-codigo-texto">
                {nomeDoArquivo}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={expandirTudo} className={CLASSE_DA_ACAO_NO_ESCURO}>
                  <ChevronsUpDown aria-hidden="true" className="size-3.5" />
                  Expandir tudo
                </button>
                <button
                  type="button"
                  onClick={() => setAbertos(new Set())}
                  className={CLASSE_DA_ACAO_NO_ESCURO}
                >
                  <ChevronsDownUp aria-hidden="true" className="size-3.5" />
                  Recolher tudo
                </button>
                <BotaoCopiar
                  valor={textoCompleto}
                  rotulo="Copiar"
                  ariaLabel={rotuloDaCopia}
                  superficie="escura"
                />
                <button
                  type="button"
                  onClick={baixar}
                  aria-label={`Baixar o arquivo ${nomeDoArquivo}`}
                  className={CLASSE_DO_BAIXAR_NO_ESCURO}
                >
                  <Download aria-hidden="true" className="size-3.5" />
                  Baixar
                </button>
                {avisoDoArquivo}
              </div>
            </div>

            {texto}
          </div>

          {legenda}
        </>
      ) : (
        <>
          {legenda}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={expandirTudo} className={CLASSE_DO_BOTAO_DA_BARRA}>
              <ChevronsUpDown aria-hidden="true" className="size-3.5" />
              Expandir tudo
            </button>
            <button
              type="button"
              onClick={() => setAbertos(new Set())}
              className={CLASSE_DO_BOTAO_DA_BARRA}
            >
              <ChevronsDownUp aria-hidden="true" className="size-3.5" />
              Recolher tudo
            </button>
            <BotaoCopiar
              valor={textoCompleto}
              rotulo={`Copiar ${extensao.toUpperCase()}`}
              ariaLabel={rotuloDaCopia}
            />
            <button type="button" onClick={baixar} className={CLASSE_DO_BOTAO_DA_BARRA}>
              <Download aria-hidden="true" className="size-3.5" />
              Baixar .{extensao}
            </button>
            {avisoDoArquivo}
          </div>

          {avisoDaAncora}

          {texto}
        </>
      )}

      {comVerbete && itemAberto && (
        <ModalDoVerbete
          campo={itemAberto.campo}
          trilha={itemAberto.trilha}
          versaoRotulo={destino.versaoRotulo}
          posicao={posicaoNoModal + 1}
          total={sequenciaDoModal.length}
          filtroAtivo={false}
          anterior={vizinho(posicaoNoModal - 1)}
          proximo={vizinho(posicaoNoModal + 1)}
          onNavegar={navegarParaTag}
          onFechar={() => setSlugAberto(null)}
          devolverFoco={devolverFoco}
          linkDoCampo={`${destino.origemUrl}${itemAberto.campo.urlCanonica}`}
          estrutura={{
            versaoSlug: destino.versaoSlug,
            formatos: destino
              .formatosDoCampo(itemAberto.campo.slug)
              .filter((outro) => outro !== formato),
          }}
        />
      )}
    </div>
  )
}
