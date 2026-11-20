import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { IndiceDeBlocos } from '../../../components/ui/IndiceDeBlocos'
import { useBlocosNavegaveis } from '../../../hooks/useBlocosNavegaveis'
import { agruparEmBlocos, filtrarBlocos } from '../../../utils/blocosDoLayout'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import type { CampoLayoutPublico, GrupoCamposLayout } from '../types/layoutPublico'
import {
  contarNovosPorBloco,
  raizDoBlocoVisivel,
  vizinhosDoBloco,
} from '../utils/blocoVisivelDoDicionario'
import { campoPassaNoDicionario, filtroDoDicionarioAtivo } from '../utils/filtroDoDicionario'
import type { FiltroDoDicionario } from '../utils/filtroDoDicionario'
import { BlocoDoDicionario } from './BlocoDoDicionario'
import type { AtalhoDaEstruturaNoDicionario } from './BlocoDoDicionario'
import { FiltrosDoDicionario } from './FiltrosDoDicionario'
import { ModalDoVerbete } from './ModalDoVerbete'

export interface DicionarioDaVersaoProps {
  /** Rótulo cru da versão ("8"): o texto ao redor decide como escrever "versão". */
  versaoRotulo: string
  totalCampos: number
  camposPorGrupo: GrupoCamposLayout[]
  /**
   * Origem absoluta da aplicação (`https://…`) — o link copiável do campo é ela + `urlCanonica`.
   * O caminho nunca é montado aqui: a fonte única é `urlCanonica`.
   */
  origemUrl: string
  /** Slug do campo apontado por `#campo-{slug}`, se houver. */
  campoDestacado?: string | null
  /** Liga os atalhos "Ver na estrutura" nas linhas e no modal. */
  atalhoDaEstrutura?: AtalhoDaEstruturaNoDicionario
  /** Com versão anterior, o leitor pode ver só o que mudou; a primeira versão não tem o alternador. */
  temVersaoAnterior?: boolean
  /** Alternador Dicionário / XML / JSON da página, que mora na barra do dicionário. */
  alternadorDeVisao?: ReactNode
}

function slugDoCampo(campo: CampoLayoutPublico): string {
  return campo.slug
}

function nomeDoCampo(campo: CampoLayoutPublico): string {
  return campo.nome
}

interface FiltroSemResultado {
  versao: string
  termoBuscado: string
  somenteReformaTributaria: boolean
  somenteNovos: boolean
}

function descreverSemResultado({
  versao,
  termoBuscado,
  somenteReformaTributaria,
  somenteNovos,
}: FiltroSemResultado): string {
  if (somenteNovos) {
    return termoBuscado === '' && !somenteReformaTributaria
      ? `Nenhum campo é novo na ${versao}.`
      : 'Nenhum campo com esses filtros.'
  }
  if (termoBuscado === '') return `Nenhum campo da ${versao} é da reforma tributária.`
  if (somenteReformaTributaria) {
    return `Nenhum campo da reforma tributária na ${versao} corresponde a “${termoBuscado}”.`
  }
  return `Nenhum campo da ${versao} corresponde a “${termoBuscado}”.`
}

const CLASSE_DO_VIZINHO =
  'inline-flex min-h-11 items-center gap-1.5 rounded px-1 text-sm font-bold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover'

/**
 * Dicionário de campos de uma versão do layout, com busca, índice lateral e o detalhe de cada
 * campo num modal. O layout é vocabulário, não comportamento: são só nome, caminho e significado;
 * tipo, tamanho e obrigatoriedade são de cada provedor.
 *
 * Sem filtro, mostra um bloco por vez: o escolhido na lateral (o primeiro, de início) ou o do campo
 * aberto, e o rodapé leva ao vizinho. Com filtro (termo, "só o que mudou" ou "só reforma"), mostra
 * todos os blocos com resultado, recolhíveis, para nenhum resultado ficar escondido.
 */
export function DicionarioDaVersao({
  versaoRotulo,
  totalCampos,
  camposPorGrupo,
  origemUrl,
  campoDestacado = null,
  atalhoDaEstrutura,
  temVersaoAnterior = false,
  alternadorDeVisao,
}: DicionarioDaVersaoProps) {
  const tituloId = useId()
  const buscaRef = useRef<HTMLInputElement | null>(null)
  const contenedorRef = useRef<HTMLDivElement | null>(null)

  const [termo, setTermo] = useState('')
  const [somenteReformaTributaria, setSomenteReformaTributaria] = useState(false)
  const [somenteNovosEscolhido, setSomenteNovos] = useState(false)
  const [raizEscolhida, setRaizEscolhida] = useState<string | null>(null)
  const [blocoParaFocar, setBlocoParaFocar] = useState<string | null>(null)
  // Sem versão anterior não há o que comparar: o recorte não vale nem se o estado sobrar.
  const somenteNovos = temVersaoAnterior && somenteNovosEscolhido
  const filtroAtual: FiltroDoDicionario = useMemo(
    () => ({ termo, somenteReformaTributaria, somenteNovos }),
    [termo, somenteReformaTributaria, somenteNovos],
  )

  const versao = formatarVersaoLayout(versaoRotulo)

  const blocosCompletos = useMemo(() => agruparEmBlocos(camposPorGrupo), [camposPorGrupo])
  const novosPorBloco = useMemo(() => contarNovosPorBloco(blocosCompletos), [blocosCompletos])

  const passaNoFiltroAtual = useCallback(
    (campo: CampoLayoutPublico) => campoPassaNoDicionario(campo, filtroAtual),
    [filtroAtual],
  )

  const blocosFiltrados = useMemo(
    () => filtrarBlocos(blocosCompletos, passaNoFiltroAtual),
    [blocosCompletos, passaNoFiltroAtual],
  )

  const limparFiltros = useCallback(() => {
    setTermo('')
    setSomenteReformaTributaria(false)
    setSomenteNovos(false)
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
  } = useBlocosNavegaveis<CampoLayoutPublico>({
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

  const filtroAtivo = filtroDoDicionarioAtivo(filtroAtual)
  const umBlocoPorVez = !filtroAtivo
  const blocosComResultado = blocosFiltrados.filter((bloco) => bloco.totalVisivel > 0)
  const raizesComResultado = blocosComResultado.map((bloco) => bloco.raiz)
  // No recorte do que mudou, o índice lista só os blocos que mudaram; nos outros filtros o bloco
  // sem resultado continua no índice, com 0.
  const blocosDoIndice = somenteNovos ? blocosComResultado : blocosFiltrados

  const raizVisivel = raizDoBlocoVisivel(
    raizesComResultado,
    raizEscolhida,
    itemAberto?.raiz ?? null,
  )
  const blocoVisivel = blocosComResultado.find((bloco) => bloco.raiz === raizVisivel)
  const vizinhos = vizinhosDoBloco(raizesComResultado, raizVisivel)

  function rotuloDoBloco(raiz: string): string {
    return blocosComResultado.find((bloco) => bloco.raiz === raiz)?.rotulo ?? raiz
  }

  function escolherBloco(raiz: string) {
    setRaizEscolhida(raiz)
    setBlocoParaFocar(raiz)
  }

  // O bloco escolhido só existe no DOM depois do commit: a rolagem e o foco esperam por ele.
  useEffect(() => {
    if (blocoParaFocar === null) return

    const bloco = document.getElementById(`bloco-${blocoParaFocar}`)
    bloco?.scrollIntoView({ block: 'start' })
    bloco?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true })
    setBlocoParaFocar(null)
  }, [blocoParaFocar])

  // Ao fechar o modal, o bloco do campo continua na tela: o foco volta para a linha dele.
  function fecharCampoNoBloco() {
    if (itemAberto) setRaizEscolhida(itemAberto.raiz)
    fecharCampo()
  }

  // Filtrar abre os blocos que passam a ter resultado: o resultado escondido num bloco fechado
  // seria uma busca que parece não achar nada. Desligar o filtro mantém o que já estava aberto.
  function aplicarFiltro(novoFiltro: FiltroDoDicionario) {
    setTermo(novoFiltro.termo)
    setSomenteReformaTributaria(novoFiltro.somenteReformaTributaria)
    setSomenteNovos(novoFiltro.somenteNovos)
    if (!filtroDoDicionarioAtivo(novoFiltro)) return

    const raizesQuePassam = filtrarBlocos(blocosCompletos, (campo) =>
      campoPassaNoDicionario(campo, novoFiltro),
    )
      .filter((bloco) => bloco.totalVisivel > 0)
      .map((bloco) => bloco.raiz)
    abrirBlocos(raizesQuePassam)
  }

  const termoBuscado = termo.trim()
  const semResultado = descreverSemResultado({
    versao,
    termoBuscado,
    somenteReformaTributaria,
    somenteNovos,
  })

  const frase = filtroAtivo
    ? `Mostrando ${totalVisivel} de ${totalCampos} campos.`
    : `${totalCampos} ${totalCampos === 1 ? 'campo' : 'campos'} no vocabulário da ${versao}.`

  const rodapeDoBloco = (vizinhos.anterior !== null || vizinhos.proximo !== null) && (
    <nav aria-label="Outros blocos" className="flex flex-wrap items-center gap-3">
      {vizinhos.anterior !== null && (
        <button
          type="button"
          onClick={() => escolherBloco(vizinhos.anterior ?? '')}
          className={CLASSE_DO_VIZINHO}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Bloco anterior: {rotuloDoBloco(vizinhos.anterior)}
        </button>
      )}
      {vizinhos.proximo !== null && (
        <button
          type="button"
          onClick={() => escolherBloco(vizinhos.proximo ?? '')}
          className={`${CLASSE_DO_VIZINHO} ml-auto`}
        >
          Próximo bloco: {rotuloDoBloco(vizinhos.proximo)}
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      )}
    </nav>
  )

  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id={tituloId} className="sr-only">
          Dicionário de campos
        </h2>
        {/* Sem filtro, o total já está no cabeçalho e na busca: a frase fica só para o leitor de tela. */}
        <p
          aria-live="polite"
          aria-atomic="true"
          className={filtroAtivo ? 'text-sm text-muted' : 'sr-only'}
        >
          {frase}
        </p>
      </header>

      <FiltrosDoDicionario
        termo={termo}
        buscaRef={buscaRef}
        totalCampos={totalCampos}
        alternadorDeVisao={alternadorDeVisao}
        somenteReformaTributaria={somenteReformaTributaria}
        somenteNovos={somenteNovos}
        comAlternadorDeMudancas={temVersaoAnterior}
        onTermoChange={(novoTermo) => aplicarFiltro({ ...filtroAtual, termo: novoTermo })}
        onAlternarReformaTributaria={() =>
          aplicarFiltro({ ...filtroAtual, somenteReformaTributaria: !somenteReformaTributaria })
        }
        onSomenteNovosChange={(novoSomenteNovos) =>
          aplicarFiltro({ ...filtroAtual, somenteNovos: novoSomenteNovos })
        }
        onLimpar={limparFiltros}
        onExpandirTodos={expandirTodos}
        onRecolherTodos={recolherTodos}
      />

      {totalCampos === 0 && (
        <EmptyState message={`Os campos da ${versao} estarão disponíveis em breve.`} />
      )}

      {totalCampos > 0 && totalVisivel === 0 && (
        <EmptyState
          message={semResultado}
          action={
            <div className="flex flex-col items-center gap-3">
              {termoBuscado !== '' && (
                <p className="max-w-prose text-sm text-muted">
                  Se você buscou pelo nome usado no provedor, consulte a tabela de campos do seu
                  provedor.
                </p>
              )}
              <button
                type="button"
                onClick={limparFiltros}
                className="text-sm font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover"
              >
                Limpar filtro
              </button>
            </div>
          }
        />
      )}

      {totalVisivel > 0 && (
        <div className="flex items-start gap-6">
          <aside className="hidden w-56 shrink-0 self-stretch lg:block">
            <IndiceDeBlocos
              titulo={`${blocosDoIndice.length} ${blocosDoIndice.length === 1 ? 'bloco' : 'blocos'}`}
              entradas={blocosDoIndice.map((bloco) => ({
                raiz: bloco.raiz,
                rotulo: bloco.rotulo,
                quantidadeVisivel: bloco.totalVisivel,
                novos: novosPorBloco.get(bloco.raiz) ?? 0,
              }))}
              raizAtual={umBlocoPorVez ? raizVisivel : null}
              onIrParaBloco={umBlocoPorVez ? escolherBloco : irParaBloco}
            />
          </aside>

          <div ref={contenedorRef} className="min-w-0 flex-1">
            {umBlocoPorVez && blocoVisivel && (
              <BlocoDoDicionario
                key={blocoVisivel.raiz}
                bloco={blocoVisivel}
                versaoRotulo={versaoRotulo}
                novosDoBloco={novosPorBloco.get(blocoVisivel.raiz) ?? 0}
                recolhivel={false}
                filtrando={false}
                slugAtivo={slugAtivo}
                onAbrirCampo={abrirCampo}
                atalhoDaEstrutura={atalhoDaEstrutura}
                rodape={rodapeDoBloco}
              />
            )}

            {!umBlocoPorVez &&
              blocosComResultado.map((bloco) => (
                <BlocoDoDicionario
                  key={bloco.raiz}
                  bloco={bloco}
                  versaoRotulo={versaoRotulo}
                  novosDoBloco={novosPorBloco.get(bloco.raiz) ?? 0}
                  aberto={blocosAbertos.has(bloco.raiz)}
                  filtrando
                  slugAtivo={slugAtivo}
                  onAlternar={alternarBloco}
                  onAbrirCampo={abrirCampo}
                  atalhoDaEstrutura={atalhoDaEstrutura}
                />
              ))}
          </div>
        </div>
      )}

      {campoAberto && itemAberto && (
        <ModalDoVerbete
          campo={itemAberto.campo}
          trilha={itemAberto.trilha}
          versaoRotulo={versaoRotulo}
          posicao={posicao}
          total={totalVisivel}
          filtroAtivo={filtroAtivo}
          anterior={anterior}
          proximo={proximo}
          onNavegar={navegarParaCampo}
          onFechar={fecharCampoNoBloco}
          devolverFoco={devolverFoco}
          linkDoCampo={`${origemUrl}${itemAberto.campo.urlCanonica}`}
          estrutura={
            atalhoDaEstrutura && {
              versaoSlug: atalhoDaEstrutura.versaoSlug,
              formatos: atalhoDaEstrutura.formatosDoCampo(itemAberto.campo.slug),
            }
          }
        />
      )}
    </section>
  )
}
