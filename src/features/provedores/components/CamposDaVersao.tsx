import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SeloVerificacao } from '../../../components/ui/SeloVerificacao'
import type { SecaoInicialDoModal, VizinhoDoCampo } from '../types/modalDoCampo'
import type { ErroResumoPublico, GrupoCampoVersao } from '../types/versaoProvedorPagina'
import {
  campoPassaNoFiltro,
  contarPorEstado,
  filtrarCampos,
  montarBlocos,
  sequenciaVisivel,
} from '../utils/blocosDeCampos'
import type { CampoNaSequencia, FiltroDeEstado } from '../utils/blocosDeCampos'
import { construirIdLinhaCampo, limparAncoraDeCampo } from '../utils/destaqueAncora'
import { BlocoDeCampos } from './BlocoDeCampos'
import { FiltrosDeCampos } from './FiltrosDeCampos'
import { IndiceDeBlocos } from './IndiceDeBlocos'
import { ModalDoCampo } from './ModalDoCampo'

export interface CamposDaVersaoProps {
  provedorNome: string
  versaoRotulo: string
  verificadoEm: string | null
  totalCampos: number
  camposPorGrupo: GrupoCampoVersao[]
  errosResumo: ErroResumoPublico[]
  urlVersaoAbsoluta: string
  /** Slug do campo apontado por `#campo-{slug}`, se houver. */
  campoDestacado?: string | null
}

interface CampoAberto {
  slug: string
  secao?: SecaoInicialDoModal
}

const CLASSE_DO_BOTAO_DE_TEXTO =
  'text-sm font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light'

function comRaiz(raizes: ReadonlySet<string>, raiz: string): ReadonlySet<string> {
  if (raizes.has(raiz)) return raizes
  return new Set([...raizes, raiz])
}

function paraVizinho(item: CampoNaSequencia | undefined): VizinhoDoCampo | null {
  if (!item) return null
  return { campoLayoutSlug: item.campo.campoLayoutSlug, nome: item.campo.nome }
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
  urlVersaoAbsoluta,
  campoDestacado = null,
}: CamposDaVersaoProps) {
  const tituloId = useId()
  const buscaRef = useRef<HTMLInputElement | null>(null)

  const [filtroEstado, setFiltroEstado] = useState<FiltroDeEstado>('todos')
  const [termo, setTermo] = useState('')
  const [campoAberto, setCampoAberto] = useState<CampoAberto | null>(null)
  const [slugAtivo, setSlugAtivo] = useState<string | null>(null)
  const [alvoDeRolagem, setAlvoDeRolagem] = useState<string | null>(null)

  const blocosCompletos = useMemo(() => montarBlocos(camposPorGrupo), [camposPorGrupo])
  const contagens = useMemo(() => contarPorEstado(camposPorGrupo), [camposPorGrupo])

  const [blocosAbertos, setBlocosAbertos] = useState<ReadonlySet<string>>(
    () => new Set(blocosCompletos.slice(0, 1).map((bloco) => bloco.raiz)),
  )

  const blocosFiltrados = useMemo(
    () => filtrarCampos(blocosCompletos, { estado: filtroEstado, termo }),
    [blocosCompletos, filtroEstado, termo],
  )
  const sequencia = useMemo(() => sequenciaVisivel(blocosFiltrados), [blocosFiltrados])
  const campoPorSlug = useMemo(
    () =>
      new Map(sequenciaVisivel(blocosCompletos).map((item) => [item.campo.campoLayoutSlug, item])),
    [blocosCompletos],
  )

  const filtroAtivo = filtroEstado !== 'todos' || termo.trim() !== ''
  const blocosComResultado = blocosFiltrados.filter((bloco) => bloco.totalVisivel > 0)
  const totalVisivel = sequencia.length

  // Slug do campo no modal neste instante: o foco volta a ele, não ao campo que abriu o modal.
  const campoAtualRef = useRef<string | null>(null)
  const campoRoladoRef = useRef<string | null>(null)

  const abrirCampo = useCallback((campoLayoutSlug: string, secao?: SecaoInicialDoModal) => {
    campoAtualRef.current = campoLayoutSlug
    setSlugAtivo(campoLayoutSlug)
    setCampoAberto({ slug: campoLayoutSlug, secao })
  }, [])

  const navegarParaCampo = useCallback(
    (campoLayoutSlug: string) => {
      const destino = campoPorSlug.get(campoLayoutSlug)
      if (destino) setBlocosAbertos((abertos) => comRaiz(abertos, destino.raiz))
      abrirCampo(campoLayoutSlug)
    },
    [abrirCampo, campoPorSlug],
  )

  const fecharCampo = useCallback(() => {
    setCampoAberto(null)
    if (campoDestacado !== null) limparAncoraDeCampo()
  }, [campoDestacado])

  const devolverFoco = useCallback(() => {
    const slug = campoAtualRef.current
    const linha = slug ? document.getElementById(construirIdLinhaCampo(slug)) : null

    if (!linha) {
      buscaRef.current?.focus()
      return
    }

    linha.scrollIntoView({ block: 'nearest' })
    linha.querySelector<HTMLElement>('[data-botao-do-campo]')?.focus({ preventScroll: true })
  }, [])

  const alternarBloco = useCallback((raiz: string, aberto: boolean) => {
    setBlocosAbertos((atuais) => {
      if (atuais.has(raiz) === aberto) return atuais
      const proximos = new Set(atuais)
      if (aberto) proximos.add(raiz)
      else proximos.delete(raiz)
      return proximos
    })
  }, [])

  const irParaBloco = useCallback((raiz: string) => {
    setBlocosAbertos((abertos) => comRaiz(abertos, raiz))

    const bloco = document.getElementById(`bloco-${raiz}`)
    bloco?.scrollIntoView({ block: 'start' })
    bloco?.querySelector('summary')?.focus({ preventScroll: true })
  }, [])

  // Filtrar abre os blocos que passam a ter resultado: o resultado escondido num bloco fechado
  // seria um filtro que parece não achar nada. Limpar o filtro mantém o que já estava aberto.
  function aplicarFiltro(estado: FiltroDeEstado, novoTermo: string) {
    setFiltroEstado(estado)
    setTermo(novoTermo)

    if (estado === 'todos' && novoTermo.trim() === '') return

    const raizesComResultado = filtrarCampos(blocosCompletos, { estado, termo: novoTermo })
      .filter((bloco) => bloco.totalVisivel > 0)
      .map((bloco) => bloco.raiz)
    setBlocosAbertos((abertos) => new Set([...abertos, ...raizesComResultado]))
  }

  function limparFiltros() {
    setFiltroEstado('todos')
    setTermo('')
  }

  function expandirTodos() {
    setBlocosAbertos(new Set(blocosComResultado.map((bloco) => bloco.raiz)))
  }

  function recolherTodos() {
    setBlocosAbertos(new Set())
  }

  // Chegar por `#campo-…` (aviso, campo relacionado, link copiado) abre o bloco, abre o modal do
  // campo e rola até a linha. Se um filtro esconde o campo, ele é limpo antes: o link prometeu
  // levar ao campo. A chegada acontece uma vez por slug; digitar um filtro depois não repete.
  useEffect(() => {
    if (campoDestacado === null) {
      campoRoladoRef.current = null
      return
    }
    if (campoRoladoRef.current === campoDestacado) return

    const destino = campoPorSlug.get(campoDestacado)
    if (!destino) return

    campoRoladoRef.current = campoDestacado

    if (!campoPassaNoFiltro(destino.campo, { estado: filtroEstado, termo })) {
      setFiltroEstado('todos')
      setTermo('')
    }
    setBlocosAbertos((abertos) => comRaiz(abertos, destino.raiz))
    abrirCampo(campoDestacado)
    setAlvoDeRolagem(campoDestacado)
    // Só o slug dispara a chegada; o filtro lido é o do render em que ele mudou.
  }, [campoDestacado])

  // A linha só está no DOM com o bloco aberto: a rolagem espera o commit do efeito acima.
  useEffect(() => {
    if (alvoDeRolagem === null) return

    document
      .getElementById(construirIdLinhaCampo(alvoDeRolagem))
      ?.scrollIntoView({ block: 'center' })
    setAlvoDeRolagem(null)
  }, [alvoDeRolagem])

  const indiceDoAberto = campoAberto
    ? sequencia.findIndex((item) => item.campo.campoLayoutSlug === campoAberto.slug)
    : -1
  const itemAberto = indiceDoAberto >= 0 ? sequencia[indiceDoAberto] : undefined

  const fraseExaustividade = filtroAtivo
    ? `Mostrando ${totalVisivel} de ${totalCampos} campos — a exaustividade vale para os ${totalCampos} campos desta versão, não para este filtro.`
    : `Esta tabela é exaustiva: o que não está aqui não se aplica a ${provedorNome} ${versaoRotulo}.`

  const botaoLimparFiltros = (
    <button type="button" onClick={limparFiltros} className={CLASSE_DO_BOTAO_DE_TEXTO}>
      Limpar filtros
    </button>
  )

  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h2 id={tituloId} className="text-subtitulo font-semibold text-ink">
          Campos e mapeamento
        </h2>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" aria-atomic="true" className="text-sm text-ink/70">
            {fraseExaustividade}
          </p>
          {verificadoEm && <SeloVerificacao data={verificadoEm} />}
        </div>
      </header>

      <FiltrosDeCampos
        estado={filtroEstado}
        termo={termo}
        contagens={contagens}
        filtroAtivo={filtroAtivo}
        buscaRef={buscaRef}
        onEstadoChange={(estado) => aplicarFiltro(estado, termo)}
        onTermoChange={(novoTermo) => aplicarFiltro(filtroEstado, novoTermo)}
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

          <div className="min-w-0 flex-1">
            {blocosComResultado.map((bloco) => (
              <BlocoDeCampos
                key={bloco.raiz}
                bloco={bloco}
                aberto={blocosAbertos.has(bloco.raiz)}
                filtrando={filtroAtivo}
                slugAtivo={slugAtivo}
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
          posicao={indiceDoAberto + 1}
          total={sequencia.length}
          filtroAtivo={filtroAtivo}
          anterior={paraVizinho(sequencia[indiceDoAberto - 1])}
          proximo={paraVizinho(sequencia[indiceDoAberto + 1])}
          secaoInicial={campoAberto.secao}
          onNavegar={navegarParaCampo}
          onFechar={fecharCampo}
          devolverFoco={devolverFoco}
          errosResumo={errosResumo}
          urlVersaoAbsoluta={urlVersaoAbsoluta}
        />
      )}
    </section>
  )
}
