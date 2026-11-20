import { useRouter } from '@tanstack/react-router'
import type { AnyRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
// O hook é compartilhado, mas o formato do id da linha e o limpador da âncora moram com a 1ª
// feature que os usou; mover tocaria todos os importadores sem ganho visível.
import {
  construirIdLinhaCampo,
  extrairSlugDoHash,
  limparAncoraDeCampo,
} from '../features/provedores/utils/destaqueAncora'
import type { TrocarUrlSemAncora } from '../features/provedores/utils/destaqueAncora'
import type { VizinhoDeCampo } from '../types/vizinhoDeCampo'
import { sequenciaDosBlocos } from '../utils/blocosDoLayout'
import type { BlocoDoLayout, CampoNaSequencia } from '../utils/blocosDoLayout'

export interface CampoAbertoDoBloco<TSecao extends string> {
  slug: string
  secao?: TSecao
}

export interface OpcoesBlocosNavegaveis<TCampo> {
  blocosCompletos: BlocoDoLayout<TCampo>[]
  blocosFiltrados: BlocoDoLayout<TCampo>[]
  /** Função estável (de módulo ou memoizada): o `memo` das linhas depende disso. */
  slugDoCampo: (campo: TCampo) => string
  nomeDoCampo: (campo: TCampo) => string
  /** Slug do campo apontado por `#campo-{slug}`, se houver. */
  campoDestacado: string | null
  passaNoFiltroAtual: (campo: TCampo) => boolean
  limparFiltros: () => void
  /** Raiz da lista: a linha do campo atual é procurada só aqui dentro. */
  contenedorRef: RefObject<HTMLElement | null>
  /** Recebe o foco quando a linha do campo atual não está na lista. */
  focoDeReservaRef: RefObject<HTMLElement | null>
}

export interface ResultadoBlocosNavegaveis<TCampo, TSecao extends string> {
  blocosAbertos: ReadonlySet<string>
  alternarBloco: (raiz: string, aberto: boolean) => void
  irParaBloco: (raiz: string) => void
  /** Abre os blocos que têm campo visível. */
  expandirTodos: () => void
  recolherTodos: () => void
  /** União com os blocos já abertos. */
  abrirBlocos: (raizes: readonly string[]) => void
  /** Campo da linha destacada; persiste depois de fechar o modal. */
  slugAtivo: string | null
  campoAberto: CampoAbertoDoBloco<TSecao> | null
  abrirCampo: (slug: string, secao?: TSecao) => void
  /** Abre o campo e o bloco em que ele está. */
  navegarParaCampo: (slug: string) => void
  fecharCampo: () => void
  devolverFoco: () => void
  sequencia: CampoNaSequencia<TCampo>[]
  itemAberto: CampoNaSequencia<TCampo> | undefined
  /** 1-based; 0 quando nada está aberto. */
  posicao: number
  total: number
  anterior: VizinhoDeCampo | null
  proximo: VizinhoDeCampo | null
}

function comRaiz(raizes: ReadonlySet<string>, raiz: string): ReadonlySet<string> {
  if (raizes.has(raiz)) return raizes
  return new Set([...raizes, raiz])
}

interface OrigemDaAncora {
  slug: string
  elemento: HTMLElement
}

/** Link `href="#campo-…"` fora da lista que recebeu o clique; o Enter no link também gera clique. */
function linkDeCampoClicado(
  evento: MouseEvent,
  contenedor: HTMLElement | null,
): OrigemDaAncora | null {
  const link = evento.target instanceof Element ? evento.target.closest('a') : null
  const href = link?.getAttribute('href')
  if (!link || !href?.startsWith('#') || contenedor?.contains(link)) return null

  const slug = extrairSlugDoHash(href)
  return slug === null ? null : { slug, elemento: link }
}

/**
 * Quem abriu o campo pela âncora, se estiver fora da lista. Vale primeiro o link clicado: no
 * Chrome, seguir o href tira o foco dele antes do `hashchange`. Sem clique, vale quem tem o foco.
 */
function origemDaChegada(
  slug: string,
  contenedor: HTMLElement | null,
  clicado: OrigemDaAncora | null,
): OrigemDaAncora | null {
  if (clicado?.slug === slug && clicado.elemento.isConnected) return clicado

  const ativo = document.activeElement
  if (!(ativo instanceof HTMLElement) || ativo === document.body) return null
  if (contenedor?.contains(ativo)) return null
  return { slug, elemento: ativo }
}

/**
 * Com a âncora na localização do router (histórico do navegador), a URL é limpa por ele e sem
 * reiniciar a rolagem. Fora disso (sem router, ou histórico em memória) vale o histórico direto.
 */
function trocaPeloRouter(router: AnyRouter | undefined): TrocarUrlSemAncora | undefined {
  if (!router || extrairSlugDoHash(`#${router.latestLocation.hash}`) === null) return undefined

  return (urlSemAncora) => {
    void router.navigate({ href: urlSemAncora, replace: true, resetScroll: false })
  }
}

function raizesComCampoVisivel<TCampo>(blocos: BlocoDoLayout<TCampo>[]): string[] {
  return blocos.filter((bloco) => bloco.totalVisivel > 0).map((bloco) => bloco.raiz)
}

/**
 * Estado de navegação de uma lista de campos em blocos recolhíveis: blocos abertos, campo aberto no
 * modal, anterior/próximo, chegada por âncora e devolução do foco ao fechar o modal.
 */
export function useBlocosNavegaveis<TCampo, TSecao extends string = never>({
  blocosCompletos,
  blocosFiltrados,
  slugDoCampo,
  nomeDoCampo,
  campoDestacado,
  passaNoFiltroAtual,
  limparFiltros,
  contenedorRef,
  focoDeReservaRef,
}: OpcoesBlocosNavegaveis<TCampo>): ResultadoBlocosNavegaveis<TCampo, TSecao> {
  const [blocosAbertos, setBlocosAbertos] = useState<ReadonlySet<string>>(
    () => new Set(blocosCompletos.slice(0, 1).map((bloco) => bloco.raiz)),
  )
  const [campoAberto, setCampoAberto] = useState<CampoAbertoDoBloco<TSecao> | null>(null)
  const [slugAtivo, setSlugAtivo] = useState<string | null>(null)
  const [alvoDeRolagem, setAlvoDeRolagem] = useState<string | null>(null)

  const sequencia = useMemo(() => sequenciaDosBlocos(blocosFiltrados), [blocosFiltrados])
  const campoPorSlug = useMemo(
    () =>
      new Map(sequenciaDosBlocos(blocosCompletos).map((item) => [slugDoCampo(item.campo), item])),
    [blocosCompletos, slugDoCampo],
  )

  // Slug do campo no modal neste instante: o foco volta a ele, não ao campo que abriu o modal.
  const campoAtualRef = useRef<string | null>(null)
  const campoRoladoRef = useRef<string | null>(null)
  // Link fora da lista que abriu o modal pela âncora (aviso, envio modelo): o foco volta a ele.
  const origemDaAncoraRef = useRef<OrigemDaAncora | null>(null)
  const linkClicadoRef = useRef<OrigemDaAncora | null>(null)
  // Fora do RouterProvider (testes de unidade) não há router: a âncora sai pelo histórico direto.
  const router: AnyRouter | undefined = useRouter({ warn: false })

  const abrirCampo = useCallback((slug: string, secao?: TSecao) => {
    campoAtualRef.current = slug
    setSlugAtivo(slug)
    setCampoAberto({ slug, secao })
  }, [])

  const navegarParaCampo = useCallback(
    (slug: string) => {
      const destino = campoPorSlug.get(slug)
      if (destino) setBlocosAbertos((abertos) => comRaiz(abertos, destino.raiz))
      abrirCampo(slug)
    },
    [abrirCampo, campoPorSlug],
  )

  const fecharCampo = useCallback(() => {
    setCampoAberto(null)
    if (campoDestacado !== null) limparAncoraDeCampo(trocaPeloRouter(router))
  }, [campoDestacado, router])

  // O alvo é procurado dentro da lista e só se ela ainda estiver na página: ao seguir um link para
  // outra tela o modal fecha no desmonte, e um id igual na página de destino não pode ganhar o foco.
  const devolverFoco = useCallback(() => {
    const origem = origemDaAncoraRef.current
    origemDaAncoraRef.current = null

    const contenedor = contenedorRef.current
    if (!contenedor || !contenedor.isConnected) return

    const slug = campoAtualRef.current
    if (origem && origem.slug === slug && origem.elemento.isConnected) {
      origem.elemento.focus()
      return
    }

    const linha = slug
      ? contenedor.querySelector<HTMLElement>(`[id="${construirIdLinhaCampo(slug)}"]`)
      : null

    if (!linha) {
      focoDeReservaRef.current?.focus()
      return
    }

    linha.scrollIntoView({ block: 'nearest' })
    linha.querySelector<HTMLElement>('[data-botao-do-campo]')?.focus({ preventScroll: true })
  }, [contenedorRef, focoDeReservaRef])

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

  const abrirBlocos = useCallback((raizes: readonly string[]) => {
    setBlocosAbertos((abertos) => new Set([...abertos, ...raizes]))
  }, [])

  const expandirTodos = useCallback(() => {
    setBlocosAbertos(new Set(raizesComCampoVisivel(blocosFiltrados)))
  }, [blocosFiltrados])

  const recolherTodos = useCallback(() => {
    setBlocosAbertos(new Set())
  }, [])

  // Captura antes da navegação do link: é o único momento em que se sabe quem foi clicado.
  useEffect(() => {
    function aoClicar(evento: MouseEvent) {
      const clicado = linkDeCampoClicado(evento, contenedorRef.current)
      if (clicado) linkClicadoRef.current = clicado
    }

    document.addEventListener('click', aoClicar, true)
    return () => document.removeEventListener('click', aoClicar, true)
  }, [contenedorRef])

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
    origemDaAncoraRef.current = origemDaChegada(
      campoDestacado,
      contenedorRef.current,
      linkClicadoRef.current,
    )
    linkClicadoRef.current = null

    if (!passaNoFiltroAtual(destino.campo)) limparFiltros()
    setBlocosAbertos((abertos) => comRaiz(abertos, destino.raiz))
    abrirCampo(campoDestacado)
    setAlvoDeRolagem(campoDestacado)
    // Só o slug dispara a chegada; o filtro lido é o do render em que ele mudou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    ? sequencia.findIndex((item) => slugDoCampo(item.campo) === campoAberto.slug)
    : -1
  const itemAberto = indiceDoAberto >= 0 ? sequencia[indiceDoAberto] : undefined

  function vizinhoNaSequencia(indice: number): VizinhoDeCampo | null {
    const item = itemAberto ? sequencia[indice] : undefined
    if (!item) return null
    return { slug: slugDoCampo(item.campo), nome: nomeDoCampo(item.campo) }
  }

  return {
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
    sequencia,
    itemAberto,
    posicao: indiceDoAberto + 1,
    total: sequencia.length,
    anterior: vizinhoNaSequencia(indiceDoAberto - 1),
    proximo: vizinhoNaSequencia(indiceDoAberto + 1),
  }
}
