import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { ArchiveX, CircleHelp, Download, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { AlternadorSegmentado } from '../../../components/ui/AlternadorSegmentado'
import { ErrorState } from '../../../components/ui/ErrorState'
import { EstadoIndisponivel } from '../../../components/ui/EstadoIndisponivel'
import { LinkExterno } from '../../../components/ui/LinkExterno'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import { agruparEmBlocos, sequenciaDosBlocos } from '../../../utils/blocosDoLayout'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import {
  extrairSlugDaEstruturaDoHash,
  useCampoDestacadoPorAncora,
} from '../../provedores/utils/destaqueAncora'
import { AvisoVocabulario } from '../components/AvisoVocabulario'
import { DicionarioDaVersao } from '../components/DicionarioDaVersao'
import { EstruturaDaVersao } from '../components/EstruturaDaVersao'
import { MarcosDaVersao } from '../components/MarcosDaVersao'
import { NotaDaVersao } from '../components/NotaDaVersao'
import { SeletorDeVersao } from '../components/SeletorDeVersao'
import { SeloEstadoDaVersao } from '../components/SeloEstadoDaVersao'
import { ErroEstruturaIndisponivel, useEstruturaLayout } from '../hooks/useEstruturaLayout'
import { useLayoutIndice } from '../hooks/useLayoutIndice'
import { ErroLayoutVersaoHttp, useLayoutVersao } from '../hooks/useLayoutVersao'
import type { TipoErroLayoutVersao } from '../hooks/useLayoutVersao'
import { VISOES_DO_LAYOUT } from '../types/estruturaLayout'
import type { FormatoDaEstrutura, VisaoDoLayout } from '../types/estruturaLayout'
import { criarFormatosDoCampo } from '../utils/formatosDoCampoNaEstrutura'
import { LINK_PLANILHA_DO_LAYOUT } from '../utils/planilhaDoLayout'

export interface LayoutVersaoPageProps {
  versaoSlug: string
  /** Visão aberta, vinda de `?visao=`. */
  visao: VisaoDoLayout
  aoMudarVisao: (visao: VisaoDoLayout) => void
}

const CLASSE_LARGURA = 'mx-auto w-full max-w-pagina px-4 lg:px-8'

const ROTULO_DA_VISAO: Record<VisaoDoLayout, string> = {
  dicionario: 'Dicionário',
  xml: 'XML (SOAP)',
  json: 'JSON (REST)',
}

const ESTADO_POR_TIPO_DE_ERRO: Record<
  TipoErroLayoutVersao,
  { icone: LucideIcon; titulo: string; tituloDaAba: string; descricao?: string }
> = {
  nao_encontrada: {
    icone: CircleHelp,
    titulo: 'Esta versão do Layout InvoiCy não existe.',
    tituloDaAba: 'Versão do Layout InvoiCy não encontrada',
    descricao: 'Confira o endereço ou escolha uma das versões publicadas.',
  },
  despublicada: {
    icone: ArchiveX,
    titulo: 'Esta versão saiu do ar.',
    tituloDaAba: 'Versão do Layout InvoiCy fora do ar',
    descricao: 'Escolha uma das versões publicadas do Layout InvoiCy.',
  },
  cap_excedido: {
    icone: Layers,
    titulo: 'Não foi possível exibir esta versão.',
    tituloDaAba: 'Versão do Layout InvoiCy não exibida',
    descricao: 'Fale com o suporte para consultar esta versão.',
  },
}

function descreverQuantidade(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}

/**
 * `/layout/{versaoSlug}` (tela 6): o dicionário denso de uma versão do Layout InvoiCy. O índice de
 * versões é consultado à parte só para a lista suspensa de versões: se ele falhar, o dicionário
 * continua de pé. A falha do acessório nunca derruba o conteúdo principal.
 */
export function LayoutVersaoPage({ versaoSlug, visao, aoMudarVisao }: LayoutVersaoPageProps) {
  const {
    data: pagina,
    isLoading,
    isError,
    error,
    refetch,
    isPlaceholderData: trocandoDeVersao,
  } = useLayoutVersao(versaoSlug, { manterAnterior: true })
  const { data: indice } = useLayoutIndice()
  const campoDestacado = useCampoDestacadoPorAncora()
  const navigate = useNavigate()

  const formatoAberto: FormatoDaEstrutura | null = visao === 'dicionario' ? null : visao
  // A estrutura só é buscada com a visão XML ou JSON aberta; no dicionário vale o que houver em cache.
  const consultaDaEstrutura = useEstruturaLayout(versaoSlug, formatoAberto !== null)
  const hash = useLocation({ select: (local) => local.hash })
  const slugAncoraDaEstrutura = formatoAberto ? extrairSlugDaEstruturaDoHash(hash) : null

  const estruturaIndisponivel = consultaDaEstrutura.error instanceof ErroEstruturaIndisponivel
  const formatosDoCampo = useMemo(
    () => criarFormatosDoCampo(consultaDaEstrutura.data, estruturaIndisponivel),
    [consultaDaEstrutura.data, estruturaIndisponivel],
  )
  const atalhoDaEstrutura = useMemo(
    () => ({ versaoSlug, formatosDoCampo }),
    [versaoSlug, formatosDoCampo],
  )
  const camposPorSlug = useMemo(
    () =>
      new Map(
        sequenciaDosBlocos(agruparEmBlocos(pagina?.camposPorGrupo ?? [])).map((item) => [
          item.campo.slug,
          item,
        ]),
      ),
    [pagina],
  )

  const camposNovos = useMemo(
    () =>
      (pagina?.camposPorGrupo ?? []).reduce(
        (soma, grupo) => soma + grupo.campos.filter((campo) => campo.novoNestaVersao).length,
        0,
      ),
    [pagina],
  )

  const erroTipado = error instanceof ErroLayoutVersaoHttp ? error : null
  const origemUrl = typeof window === 'undefined' ? '' : window.location.origin

  useTituloDaPagina(pagina ? `Layout InvoiCy ${formatarVersaoLayout(pagina.versao.rotulo)}` : null)

  const alternadorDeVisao = (
    <AlternadorSegmentado
      rotulo="Formas de ver o Layout InvoiCy"
      tamanho="barra"
      opcoes={VISOES_DO_LAYOUT}
      rotuloDaOpcao={ROTULO_DA_VISAO}
      selecionada={visao}
      onSelecionar={(novaVisao) => {
        if (novaVisao !== visao) aoMudarVisao(novaVisao)
      }}
    />
  )

  function irParaVersao(slug: string) {
    void navigate({ to: '/layout/$versaoSlug', params: { versaoSlug: slug }, search: { visao } })
  }

  const normaOrigem = pagina?.versao.normaOrigem?.trim() || null

  return (
    <div className="flex min-h-screen flex-col bg-surface-hover">
      <CabecalhoPublico />

      <main id={ID_CONTEUDO_PRINCIPAL} tabIndex={-1} className="flex flex-1 flex-col">
        {isLoading && (
          <div
            aria-live="polite"
            aria-busy="true"
            className={`${CLASSE_LARGURA} flex flex-col gap-4 py-8`}
          >
            <span className="sr-only">Carregando o dicionário de campos…</span>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {/* Limite estrutural (`cap_excedido`) também cai aqui, e não no ErrorState: oferecer
            "tentar novamente" seria mandar o leitor repetir algo que nunca vai dar certo. */}
        {isError && erroTipado && (
          <div className={`${CLASSE_LARGURA} py-8`}>
            <EstadoIndisponivel {...ESTADO_POR_TIPO_DE_ERRO[erroTipado.tipo]}>
              <Link
                to="/layout"
                activeOptions={{ exact: true }}
                className="text-sm font-semibold text-primary-medium hover:underline"
              >
                Ver as versões publicadas
              </Link>
            </EstadoIndisponivel>
          </div>
        )}

        {isError && !erroTipado && (
          <div className={`${CLASSE_LARGURA} py-8`}>
            <ErrorState onRetry={() => refetch()} />
          </div>
        )}

        {!isLoading && !isError && pagina && (
          <>
            <div className="border-b border-border bg-white">
              <div className={`${CLASSE_LARGURA} flex flex-col gap-5 py-6`}>
                <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                  <div className="flex min-w-0 flex-col gap-2">
                    <p className="text-xs text-muted">
                      <Link
                        to="/layout"
                        activeOptions={{ exact: true }}
                        className="underline hover:text-ink"
                      >
                        Layout InvoiCy
                      </Link>{' '}
                      / {formatarVersaoLayout(pagina.versao.rotulo, { maiuscula: true })}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-titulo font-extrabold text-primary lg:text-h1">
                        Layout InvoiCy {formatarVersaoLayout(pagina.versao.rotulo)}
                      </h1>
                      <SeloEstadoDaVersao estado={pagina.versao.estado} />
                    </div>
                    <p data-fatos-da-versao="" className="text-sm text-muted">
                      {normaOrigem && <>origem {normaOrigem} · </>}
                      <strong className="font-semibold text-ink">
                        {descreverQuantidade(pagina.totalCampos, 'campo', 'campos')}
                      </strong>
                      {camposNovos > 0 && ` · ${camposNovos} novos nesta versão`}
                    </p>
                    <AvisoVocabulario />
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    {indice && (
                      <SeletorDeVersao
                        versoes={indice.versoes}
                        versaoAtualSlug={versaoSlug}
                        onEscolher={irParaVersao}
                      />
                    )}
                    <LinkExterno
                      href={LINK_PLANILHA_DO_LAYOUT}
                      classeDoIcone="size-4"
                      className="relative inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-primary-medium px-4 text-sm font-bold text-white transition-shadow duration-150 hover:shadow-panel"
                    >
                      <Download aria-hidden="true" className="size-4" />
                      Baixar planilha <span className="text-xs font-semibold">.xlsx · GitHub</span>
                    </LinkExterno>
                  </div>
                </div>

                <MarcosDaVersao
                  versaoRotulo={pagina.versao.rotulo}
                  marcos={pagina.versao}
                  destaque="prazo"
                  estado={pagina.versao.estado.toLowerCase()}
                />
              </div>
            </div>

            <div
              aria-busy={trocandoDeVersao}
              className={`${CLASSE_LARGURA} flex flex-col gap-6 py-7`}
            >
              {!pagina.anterior && pagina.descricao && (
                <section aria-labelledby="nota-versao-titulo" className="flex flex-col gap-2">
                  <h2 id="nota-versao-titulo" className="text-subtitulo font-semibold text-ink">
                    Nota da {formatarVersaoLayout(pagina.versao.rotulo)}
                  </h2>
                  <NotaDaVersao descricao={pagina.descricao} />
                </section>
              )}

              {visao === 'dicionario' ? (
                <DicionarioDaVersao
                  key={pagina.versao.slug}
                  versaoRotulo={pagina.versao.rotulo}
                  totalCampos={pagina.totalCampos}
                  camposPorGrupo={pagina.camposPorGrupo}
                  origemUrl={origemUrl}
                  campoDestacado={campoDestacado}
                  atalhoDaEstrutura={atalhoDaEstrutura}
                  temVersaoAnterior={pagina.anterior !== null}
                  alternadorDeVisao={alternadorDeVisao}
                />
              ) : (
                <>
                  <div className="rounded-[var(--radius-card)] border border-border bg-white p-4">
                    {alternadorDeVisao}
                  </div>
                  <EstruturaDaVersao
                    formato={visao}
                    versaoSlug={versaoSlug}
                    versaoRotulo={pagina.versao.rotulo}
                    estrutura={consultaDaEstrutura.data}
                    isLoading={consultaDaEstrutura.isLoading}
                    error={consultaDaEstrutura.error}
                    onRetry={() => void consultaDaEstrutura.refetch()}
                    camposPorSlug={camposPorSlug}
                    formatosDoCampo={formatosDoCampo}
                    slugAncora={slugAncoraDaEstrutura}
                    origemUrl={origemUrl}
                  />
                </>
              )}
            </div>
          </>
        )}
      </main>

      <RodapeContextual contexto={{ tipo: 'layout' }} />
    </div>
  )
}
