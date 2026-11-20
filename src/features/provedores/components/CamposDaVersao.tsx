import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { IndiceDeBlocos } from '../../../components/ui/IndiceDeBlocos'
import { useBlocoAtualNaRolagem } from '../../../hooks/useBlocoAtualNaRolagem'
import { useBlocosNavegaveis } from '../../../hooks/useBlocosNavegaveis'
import type { VizinhoDeCampo } from '../../../types/vizinhoDeCampo'
import type { SecaoInicialDoModal, VizinhoDoCampo } from '../types/modalDoCampo'
import type {
  CampoVersaoPublico,
  ErroResumoPublico,
  GrupoCampoVersao,
  NaturezaOperacaoPublica,
} from '../types/versaoProvedorPagina'
import {
  campoPassaNoFiltro,
  contarComRejeicao,
  contarDaReformaTributaria,
  contarPorEstado,
  filtrarCampos,
  filtroDeCamposAtivo,
  montarBlocos,
  versaoTemExemplo,
} from '../utils/blocosDeCampos'
import type { FiltroDeCampos, FiltroDeEstado } from '../utils/blocosDeCampos'
import { ID_SECAO_CAMPOS } from '../utils/secoesDoProvedor'
import { BlocoDeCampos } from './BlocoDeCampos'
import { FiltrosDeCampos } from './FiltrosDeCampos'
import { LegendaDaTabelaDeCampos } from './LegendaDaTabelaDeCampos'
import { ModalDoCampo } from './ModalDoCampo'

export interface CamposDaVersaoProps {
  provedorNome: string
  versaoRotulo: string
  totalCampos: number
  camposPorGrupo: GrupoCampoVersao[]
  errosResumo: ErroResumoPublico[]
  urlProvedorAbsoluta: string
  /** Slug do campo apontado por `#campo-{slug}`, se houver. */
  campoDestacado?: string | null
  /** De-para mostrado no modal do campo `natOp`. */
  naturezasOperacao?: NaturezaOperacaoPublica[]
  /** Atalho à direita do resumo da tabela; na página, o "Ver como XML montado". */
  atalhoDoTopo?: ReactNode
}

const CLASSE_DO_BOTAO_DE_TEXTO =
  'text-sm font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover'

function slugDoCampo(campo: CampoVersaoPublico): string {
  return campo.campoLayoutSlug
}

function nomeDoCampo(campo: CampoVersaoPublico): string {
  return campo.nome
}

function paraVizinhoDoCampo(vizinho: VizinhoDeCampo | null): VizinhoDoCampo | null {
  if (!vizinho) return null
  return { campoLayoutSlug: vizinho.slug, nome: vizinho.nome }
}

/**
 * Campos aceitos pela versão, em blocos recolhíveis por raiz do layout, com filtros, índice
 * lateral e o detalhe de cada campo num modal. A data de verificação fica só no cabeçalho do
 * provedor. Versão sem campo mostra só o estado vazio, sem filtros sem o que filtrar.
 */
export function CamposDaVersao({
  provedorNome,
  versaoRotulo,
  totalCampos,
  camposPorGrupo,
  errosResumo,
  urlProvedorAbsoluta,
  campoDestacado = null,
  naturezasOperacao = [],
  atalhoDoTopo,
}: CamposDaVersaoProps) {
  const tituloId = useId()
  const buscaRef = useRef<HTMLInputElement | null>(null)
  const contenedorRef = useRef<HTMLDivElement | null>(null)

  const [filtroEstado, setFiltroEstado] = useState<FiltroDeEstado>('todos')
  const [termo, setTermo] = useState('')
  const [somenteReformaTributaria, setSomenteReformaTributaria] = useState(false)
  const filtroAtual: FiltroDeCampos = { estado: filtroEstado, termo, somenteReformaTributaria }

  const blocosCompletos = useMemo(() => montarBlocos(camposPorGrupo), [camposPorGrupo])
  const contagens = useMemo(() => contarPorEstado(camposPorGrupo), [camposPorGrupo])
  const contagemDaReforma = useMemo(
    () => contarDaReformaTributaria(camposPorGrupo),
    [camposPorGrupo],
  )
  const camposComRejeicao = useMemo(() => contarComRejeicao(camposPorGrupo), [camposPorGrupo])
  const mostrarExemplo = useMemo(() => versaoTemExemplo(camposPorGrupo), [camposPorGrupo])

  const blocosFiltrados = useMemo(
    () => filtrarCampos(blocosCompletos, { estado: filtroEstado, termo, somenteReformaTributaria }),
    [blocosCompletos, filtroEstado, termo, somenteReformaTributaria],
  )

  const passaNoFiltroAtual = useCallback(
    (campo: CampoVersaoPublico) =>
      campoPassaNoFiltro(campo, { estado: filtroEstado, termo, somenteReformaTributaria }),
    [filtroEstado, termo, somenteReformaTributaria],
  )

  const limparFiltros = useCallback(() => {
    setFiltroEstado('todos')
    setTermo('')
    setSomenteReformaTributaria(false)
  }, [])

  const {
    blocosAbertos,
    alternarBloco,
    irParaBloco,
    expandirTodos,
    recolherTodos,
    abrirBlocos,
    slugAtivo,
    campoAberto,
    abrirCampo,
    navegarParaCampo,
    fecharCampo,
    devolverFoco,
    itemAberto,
    posicao,
    total: totalVisivel,
    anterior,
    proximo,
  } = useBlocosNavegaveis<CampoVersaoPublico, SecaoInicialDoModal>({
    blocosCompletos,
    blocosFiltrados,
    slugDoCampo,
    nomeDoCampo,
    campoDestacado,
    passaNoFiltroAtual,
    limparFiltros,
    contenedorRef,
    focoDeReservaRef: buscaRef,
  })

  const filtroAtivo = filtroDeCamposAtivo(filtroAtual)
  const blocosComResultado = useMemo(
    () => blocosFiltrados.filter((bloco) => bloco.totalVisivel > 0),
    [blocosFiltrados],
  )
  const raizesComResultado = useMemo(
    () => blocosComResultado.map((bloco) => bloco.raiz),
    [blocosComResultado],
  )
  const { raizAtual, marcarBloco } = useBlocoAtualNaRolagem(raizesComResultado)

  function irParaBlocoDoIndice(raiz: string) {
    irParaBloco(raiz)
    marcarBloco(raiz)
  }

  // Filtrar abre os blocos que passam a ter resultado: o resultado escondido num bloco fechado
  // seria um filtro que parece não achar nada. Limpar o filtro mantém o que já estava aberto.
  function aplicarFiltro(novoFiltro: FiltroDeCampos) {
    setFiltroEstado(novoFiltro.estado)
    setTermo(novoFiltro.termo)
    setSomenteReformaTributaria(novoFiltro.somenteReformaTributaria)

    if (!filtroDeCamposAtivo(novoFiltro)) return

    const raizesDoNovoFiltro = filtrarCampos(blocosCompletos, novoFiltro)
      .filter((bloco) => bloco.totalVisivel > 0)
      .map((bloco) => bloco.raiz)
    abrirBlocos(raizesDoNovoFiltro)
  }

  const resumoDaTabela = filtroAtivo
    ? `Mostrando ${totalVisivel} de ${totalCampos} campos.`
    : `Campos aceitos pelo ${provedorNome} nesta versão.`

  const botaoLimparFiltros = (
    <button type="button" onClick={limparFiltros} className={CLASSE_DO_BOTAO_DE_TEXTO}>
      Limpar filtros
    </button>
  )

  return (
    <section
      id={ID_SECAO_CAMPOS}
      aria-labelledby={tituloId}
      className="flex scroll-mt-24 flex-col gap-4"
    >
      {/* A aba já diz onde se está; o título fica para o leitor de tela nomear a região. */}
      <h2 id={tituloId} className="sr-only">
        Campos e mapeamento
      </h2>

      {totalCampos === 0 && (
        <EmptyState message="Os campos desta versão estarão disponíveis em breve." />
      )}

      {totalCampos > 0 && (
        <>
          <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <p aria-live="polite" aria-atomic="true" className="text-sm text-muted">
              {resumoDaTabela}
            </p>
            {atalhoDoTopo && <div className="shrink-0">{atalhoDoTopo}</div>}
          </header>

          <FiltrosDeCampos
            estado={filtroEstado}
            termo={termo}
            contagens={contagens}
            somenteReformaTributaria={somenteReformaTributaria}
            contagemDaReforma={contagemDaReforma}
            filtroAtivo={filtroAtivo}
            buscaRef={buscaRef}
            onEstadoChange={(estado) => aplicarFiltro({ ...filtroAtual, estado })}
            onTermoChange={(novoTermo) => aplicarFiltro({ ...filtroAtual, termo: novoTermo })}
            onAlternarReformaTributaria={() =>
              aplicarFiltro({ ...filtroAtual, somenteReformaTributaria: !somenteReformaTributaria })
            }
            onLimpar={limparFiltros}
            onExpandirTodos={expandirTodos}
            onRecolherTodos={recolherTodos}
          />
        </>
      )}

      {totalCampos > 0 && totalVisivel === 0 && (
        <EmptyState
          message="Nenhum campo encontrado para esse filtro."
          action={botaoLimparFiltros}
        />
      )}

      {totalVisivel > 0 && (
        <div className="flex items-start gap-6">
          <aside className="hidden w-52 shrink-0 self-stretch lg:block">
            <IndiceDeBlocos
              entradas={blocosFiltrados.map((bloco) => ({
                raiz: bloco.raiz,
                rotulo: bloco.rotulo,
                quantidadeVisivel: bloco.totalVisivel,
              }))}
              onIrParaBloco={irParaBlocoDoIndice}
              raizAtual={raizAtual}
            />
          </aside>

          <div ref={contenedorRef} className="min-w-0 flex-1">
            <div className="mb-2 px-1">
              <LegendaDaTabelaDeCampos
                camposComRejeicao={camposComRejeicao}
                mostrarReformaTributaria={contagemDaReforma > 0}
              />
            </div>
            {blocosComResultado.map((bloco) => (
              <BlocoDeCampos
                key={bloco.raiz}
                bloco={bloco}
                aberto={blocosAbertos.has(bloco.raiz)}
                filtrando={filtroAtivo}
                slugAtivo={slugAtivo}
                mostrarExemplo={mostrarExemplo}
                onAlternar={alternarBloco}
                onAbrirCampo={abrirCampo}
              />
            ))}
          </div>
        </div>
      )}

      {campoAberto && itemAberto && (
        <ModalDoCampo
          campo={itemAberto.campo}
          trilha={itemAberto.trilha}
          provedorNome={provedorNome}
          versaoRotulo={versaoRotulo}
          posicao={posicao}
          total={totalVisivel}
          filtroAtivo={filtroAtivo}
          anterior={paraVizinhoDoCampo(anterior)}
          proximo={paraVizinhoDoCampo(proximo)}
          secaoInicial={campoAberto.secao}
          onNavegar={navegarParaCampo}
          onFechar={fecharCampo}
          devolverFoco={devolverFoco}
          errosResumo={errosResumo}
          urlProvedorAbsoluta={urlProvedorAbsoluta}
          naturezasOperacao={naturezasOperacao}
        />
      )}
    </section>
  )
}
