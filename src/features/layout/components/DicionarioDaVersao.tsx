import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { IndiceDeBlocos } from '../../../components/ui/IndiceDeBlocos'
import { useBlocosNavegaveis } from '../../../hooks/useBlocosNavegaveis'
import { agruparEmBlocos, filtrarBlocos } from '../../../utils/blocosDoLayout'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import type { CampoLayoutPublico, GrupoCamposLayout } from '../types/layoutPublico'
import { campoPassaNoDicionario } from '../utils/filtroDoDicionario'
import { BlocoDoDicionario } from './BlocoDoDicionario'
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
}

function slugDoCampo(campo: CampoLayoutPublico): string {
  return campo.slug
}

function nomeDoCampo(campo: CampoLayoutPublico): string {
  return campo.nome
}

/**
 * Dicionário de campos de uma versão do layout, em blocos recolhíveis por raiz, com busca, índice
 * lateral e o detalhe de cada campo num modal. O layout é vocabulário, não comportamento: são só
 * nome, caminho e significado; tipo, tamanho e obrigatoriedade são de cada provedor.
 *
 * O filtro é em memória sobre o dicionário inteiro e muda só o texto da contagem.
 */
export function DicionarioDaVersao({
  versaoRotulo,
  totalCampos,
  camposPorGrupo,
  origemUrl,
  campoDestacado = null,
}: DicionarioDaVersaoProps) {
  const tituloId = useId()
  const buscaRef = useRef<HTMLInputElement | null>(null)
  const contenedorRef = useRef<HTMLDivElement | null>(null)

  const [termo, setTermo] = useState('')

  const versao = formatarVersaoLayout(versaoRotulo)

  const blocosCompletos = useMemo(() => agruparEmBlocos(camposPorGrupo), [camposPorGrupo])

  const novosPorBloco = useMemo(
    () =>
      new Map(
        blocosCompletos.map((bloco) => [
          bloco.raiz,
          bloco.subgrupos.reduce(
            (soma, subgrupo) =>
              soma + subgrupo.campos.filter((campo) => campo.novoNestaVersao).length,
            0,
          ),
        ]),
      ),
    [blocosCompletos],
  )

  const passaNoFiltroAtual = useCallback(
    (campo: CampoLayoutPublico) => campoPassaNoDicionario(campo, termo),
    [termo],
  )

  const blocosFiltrados = useMemo(
    () => filtrarBlocos(blocosCompletos, passaNoFiltroAtual),
    [blocosCompletos, passaNoFiltroAtual],
  )

  const limparFiltros = useCallback(() => setTermo(''), [])

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

  const filtroAtivo = termo.trim() !== ''
  const blocosComResultado = blocosFiltrados.filter((bloco) => bloco.totalVisivel > 0)

  // Digitar abre os blocos que passam a ter resultado: o resultado escondido num bloco fechado
  // seria uma busca que parece não achar nada. Limpar o termo mantém o que já estava aberto.
  function alterarTermo(novoTermo: string) {
    setTermo(novoTermo)
    if (novoTermo.trim() === '') return

    const raizesComResultado = filtrarBlocos(blocosCompletos, (campo) =>
      campoPassaNoDicionario(campo, novoTermo),
    )
      .filter((bloco) => bloco.totalVisivel > 0)
      .map((bloco) => bloco.raiz)
    abrirBlocos(raizesComResultado)
  }

  const frase = filtroAtivo
    ? `Mostrando ${totalVisivel} de ${totalCampos} campos.`
    : `${totalCampos} ${totalCampos === 1 ? 'campo' : 'campos'} no vocabulário da ${versao}.`

  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id={tituloId} className="text-subtitulo font-semibold text-ink">
          Dicionário de campos
        </h2>
        <p aria-live="polite" aria-atomic="true" className="text-sm text-ink/70">
          {frase}
        </p>
      </header>

      <FiltrosDoDicionario
        termo={termo}
        buscaRef={buscaRef}
        onTermoChange={alterarTermo}
        onLimpar={limparFiltros}
        onExpandirTodos={expandirTodos}
        onRecolherTodos={recolherTodos}
      />

      {totalCampos === 0 && <EmptyState message={`A ${versao} ainda não tem campos publicados.`} />}

      {totalCampos > 0 && totalVisivel === 0 && (
        <EmptyState
          message={`Nenhum campo da ${versao} corresponde a “${termo.trim()}”.`}
          action={
            <div className="flex flex-col items-center gap-3">
              <p className="max-w-prose text-sm text-ink/70">
                O nome pode ser o do provedor, não o do layout. A tabela do provedor mostra os dois
                lados lado a lado.
              </p>
              <button
                type="button"
                onClick={limparFiltros}
                className="text-sm font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
              >
                Limpar filtro
              </button>
            </div>
          }
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
            {blocosComResultado.map((bloco) => (
              <BlocoDoDicionario
                key={bloco.raiz}
                bloco={bloco}
                versaoRotulo={versaoRotulo}
                novosDoBloco={novosPorBloco.get(bloco.raiz) ?? 0}
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
          onFechar={fecharCampo}
          devolverFoco={devolverFoco}
          linkDoCampo={`${origemUrl}${itemAberto.campo.urlCanonica}`}
        />
      )}
    </section>
  )
}
