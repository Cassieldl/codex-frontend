import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { IndiceDeBlocos } from '../../../components/ui/IndiceDeBlocos'
import { SeloVerificacao } from '../../../components/ui/SeloVerificacao'
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
  verificadoEm: string | null
  totalCampos: number
  camposPorGrupo: GrupoCampoVersao[]
  errosResumo: ErroResumoPublico[]
  urlProvedorAbsoluta: string
  /** Slug do campo apontado por `#campo-{slug}`, se houver. */
  campoDestacado?: string | null
  /** De-para mostrado no modal do campo `natOp`. */
  naturezasOperacao?: NaturezaOperacaoPublica[]
}

const CLASSE_DO_BOTAO_DE_TEXTO =
  'text-sm font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light'

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
 * Lista exaustiva de campos da versão, em blocos recolhíveis por raiz do layout, com filtros,
 * índice lateral e o detalhe de cada campo num modal. A ausência de um campo aqui é informação de
 * negócio ("não se aplica"), por isso a afirmação de exaustividade e o selo de verificação ficam
 * junto da lista: o filtro muda só o texto da afirmação, nunca o selo.
 */
export function CamposDaVersao({
  provedorNome,
  versaoRotulo,
  verificadoEm,
  totalCampos,
  camposPorGrupo,
  errosResumo,
  urlProvedorAbsoluta,
  campoDestacado = null,
  naturezasOperacao = [],
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
  const blocosComResultado = blocosFiltrados.filter((bloco) => bloco.totalVisivel > 0)

  // Filtrar abre os blocos que passam a ter resultado: o resultado escondido num bloco fechado
  // seria um filtro que parece não achar nada. Limpar o filtro mantém o que já estava aberto.
  function aplicarFiltro(novoFiltro: FiltroDeCampos) {
    setFiltroEstado(novoFiltro.estado)
    setTermo(novoFiltro.termo)
    setSomenteReformaTributaria(novoFiltro.somenteReformaTributaria)

    if (!filtroDeCamposAtivo(novoFiltro)) return

    const raizesComResultado = filtrarCampos(blocosCompletos, novoFiltro)
      .filter((bloco) => bloco.totalVisivel > 0)
      .map((bloco) => bloco.raiz)
    abrirBlocos(raizesComResultado)
  }

  const fraseExaustividade = filtroAtivo
    ? `Mostrando ${totalVisivel} de ${totalCampos} campos. A exaustividade vale para os ${totalCampos} campos desta versão, não para este filtro.`
    : `Esta tabela é exaustiva: o que não está aqui não se aplica a ${provedorNome} ${versaoRotulo}.`

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
      <header className="flex flex-col gap-2">
        <h2 id={tituloId} className="text-subtitulo font-semibold text-ink">
          Campos e mapeamento
        </h2>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" aria-atomic="true" className="text-sm text-muted">
            {fraseExaustividade}
          </p>
          {verificadoEm && <SeloVerificacao data={verificadoEm} />}
        </div>
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

      {totalCampos === 0 && <EmptyState message="Esta versão ainda não tem campos publicados." />}

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
              onIrParaBloco={irParaBloco}
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
