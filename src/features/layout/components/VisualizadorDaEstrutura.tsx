import { Download } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import type { VizinhoDeCampo } from '../../../types/vizinhoDeCampo'
import { baixarArquivoDeTexto } from '../../../utils/baixarArquivoDeTexto'
import type { CampoNaSequencia } from '../../../utils/blocosDoLayout'
import { construirIdLinhaEstrutura } from '../../provedores/utils/destaqueAncora'
import { useAncoraDaEstrutura } from '../hooks/useAncoraDaEstrutura'
import { ROTULO_DO_FORMATO } from '../types/estruturaLayout'
import type { FormatoDaEstrutura, NoEstrutura } from '../types/estruturaLayout'
import type { CampoLayoutPublico } from '../types/layoutPublico'
import type { FormatosDoCampo } from '../utils/formatosDoCampoNaEstrutura'
import {
  gruposAbertosPorPadrao,
  montarLinhasDaEstrutura,
  textoDaLinha,
} from '../utils/linhasDaEstrutura'
import { CLASSE_DO_MARCADOR, LinhaDoTextoDaEstrutura } from './LinhaDoTextoDaEstrutura'
import type { AcaoDaTag } from './LinhaDoTextoDaEstrutura'
import { ModalDoVerbete } from './ModalDoVerbete'
import { SeloReformaTributaria } from '../../../components/ui/SeloReformaTributaria'

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
}

const EXTENSAO: Record<FormatoDaEstrutura, { extensao: string; mime: string }> = {
  xml: { extensao: 'xml', mime: 'application/xml' },
  json: { extensao: 'json', mime: 'application/json' },
}

const LEGENDA_DA_TAG: Record<DestinoDaTag['tipo'], string> = {
  verbete: 'Tags sublinhadas abrem o verbete do campo.',
  linhaDaTabela: 'Tags sublinhadas levam ao campo na tabela desta versão.',
}

const SEM_CAMPOS: ReadonlyMap<string, CampoNaSequencia<CampoLayoutPublico>> = new Map()

const CLASSE_DA_ACAO =
  'text-sm font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light'

function comGrupos(abertos: ReadonlySet<number>, grupos: readonly number[]): ReadonlySet<number> {
  if (grupos.every((grupo) => abertos.has(grupo))) return abertos
  return new Set([...abertos, ...grupos])
}

function daReformaTributaria(destino: DestinoDaTag, slug: string | null): boolean {
  if (slug === null) return false
  if (destino.tipo === 'verbete') {
    return destino.camposPorSlug.get(slug)?.campo.reformaTributaria === true
  }
  return destino.camposDaReforma.has(slug)
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
}: VisualizadorDaEstruturaProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null)
  // Linha da tag no modal neste instante: o modal devolve o foco depois de sair do DOM, quando o
  // estado já foi limpo.
  const linhaDaTagAbertaRef = useRef<number | null>(null)

  const comVerbete = destino.tipo === 'verbete'
  const camposPorSlug = comVerbete ? destino.camposPorSlug : SEM_CAMPOS
  const slugAncora = comVerbete ? destino.slugAncora : null

  const { linhas, ancoras } = useMemo(() => montarLinhasDaEstrutura(raiz, formato), [raiz, formato])

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

  const linhaDaAncora = slugAncora === null ? null : (ancoras.get(slugAncora)?.linha ?? null)
  const nomeDaAncora =
    slugAncora === null ? null : (camposPorSlug.get(slugAncora)?.campo.nome ?? slugAncora)

  const visiveis: ReactNode[] = []
  for (let indice = 0; indice < linhas.length;) {
    const linha = linhas[indice]
    const recolhido = linha.fimDoGrupo !== null && !abertos.has(indice)
    const slug = linha.no?.campoSlug ?? null
    const ehAncora = comVerbete && slug !== null && ancoras.get(slug)?.linha === indice

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
        daReformaTributaria={daReformaTributaria(destino, slug)}
        onAlternarGrupo={alternarGrupo}
        onAbrirTag={abrirTag}
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() =>
            setAbertos(
              new Set(
                linhas.flatMap((linha, indice) => (linha.fimDoGrupo !== null ? [indice] : [])),
              ),
            )
          }
          className={CLASSE_DA_ACAO}
        >
          Expandir tudo
        </button>
        <button type="button" onClick={() => setAbertos(new Set())} className={CLASSE_DA_ACAO}>
          Recolher tudo
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <BotaoCopiar
            valor={textoCompleto}
            rotulo={`Copiar ${extensao.toUpperCase()}`}
            ariaLabel={rotuloDaCopia}
          />
          <button
            type="button"
            onClick={baixar}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] border border-border bg-white px-2.5 text-xs font-medium text-ink hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
          >
            <Download aria-hidden="true" className="size-3.5" />
            Baixar .{extensao}
          </button>
          <span role="status" aria-live="polite" className="sr-only">
            {avisoDoDownload}
          </span>
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <span>{LEGENDA_DA_TAG[destino.tipo]}</span>
        <span className={CLASSE_DO_MARCADOR}>só SOAP</span>
        <span>existe só no envio XML;</span>
        <span className={CLASSE_DO_MARCADOR}>só REST</span>
        <span>existe só no envio JSON;</span>
        <span className={CLASSE_DO_MARCADOR}>uma entre as opções</span>
        <span>informe só uma das tags irmãs com esta marca.</span>
        <SeloReformaTributaria className="ml-3" />
        <span>campo da reforma tributária.</span>
      </p>

      {slugAncora !== null && linhaDaAncora === null && (
        <p
          role="status"
          className="rounded-[var(--radius-control)] bg-alert-info px-3 py-2 text-sm text-ink"
        >
          {nomeDaAncora} não aparece na estrutura {ROTULO_DO_FORMATO[formato]} desta versão.
        </p>
      )}

      <div
        ref={contenedorRef}
        role="region"
        aria-label={rotuloDaRegiao}
        // Região rolável na horizontal precisa ser alcançável pelo teclado.
        tabIndex={0}
        className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-white py-3 font-mono text-[13px] leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
      >
        {visiveis}
      </div>

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
