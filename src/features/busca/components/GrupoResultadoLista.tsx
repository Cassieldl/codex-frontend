import { isAxiosError } from 'axios'
import { useRef, useState } from 'react'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Pagination } from '../../../components/ui/Pagination'
import { Skeleton } from '../../../components/ui/Skeleton'
import type { ParametrosBusca } from '../hooks/buscaKeys'
import { useGrupoDaBusca } from '../hooks/useGrupoDaBusca'
import type { GrupoResultado, ResultadoItem } from '../types/resultadoBusca'
import { CartaoResultadoBusca } from './CartaoResultadoBusca'

/** O teto da API é 50 por página: as opções param aí. */
const TAMANHO_PADRAO_DO_GRUPO = 25

const TAMANHOS_DE_PAGINA_DO_GRUPO = [TAMANHO_PADRAO_DO_GRUPO, 50]

const ESQUELETOS_POR_PAGINA = 3

export interface GrupoResultadoListaProps {
  grupo: GrupoResultado
  /** O termo e o filtro que produziram o grupo: a página seguinte repete os dois. */
  parametros: ParametrosBusca
}

function ListaDeCartoes({ itens }: { itens: ResultadoItem[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {itens.map((item, indice) => (
        // A `url` se repete (aviso do provedor e da versão vão para `#avisos`) e o item não
        // traz id: a posição desempata.
        <li key={`${item.tipo}-${indice}-${item.url}`}>
          <CartaoResultadoBusca item={item} />
        </li>
      ))}
    </ul>
  )
}

function CarregandoPagina({ rotulo }: { rotulo: string }) {
  return (
    <div aria-live="polite" aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">Carregando mais resultados de {rotulo}…</span>
      {Array.from({ length: ESQUELETOS_POR_PAGINA }, (_, indice) => (
        <Skeleton key={indice} className="h-24 w-full" />
      ))}
    </div>
  )
}

/**
 * Um grupo de resultados por tipo (§7.1). A busca sem recorte traz os itens mais pontuados de
 * todos os tipos juntos, então um grupo pode chegar com parte do total. Nesse caso o grupo mostra
 * o que veio e um botão "Ver todos". Só depois do clique ele pede as próprias páginas (`tipo` +
 * `pagina`) e mostra a paginação: cada pedido conta no limite por IP da busca, e abrir a tela
 * não pode gastar esse limite sozinho. Enquanto a primeira página carrega, os itens que já
 * vieram continuam na tela.
 */
export function GrupoResultadoLista({ grupo, parametros }: GrupoResultadoListaProps) {
  const secaoRef = useRef<HTMLElement | null>(null)
  const tituloRef = useRef<HTMLHeadingElement | null>(null)
  const [paginacaoAberta, setPaginacaoAberta] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PADRAO_DO_GRUPO)

  const tituloGrupoId = `grupo-resultado-${grupo.tipo}`
  const precisaPaginar = grupo.total > grupo.itens.length

  const paginaDoGrupo = useGrupoDaBusca(
    { ...parametros, tipo: grupo.tipo, pagina, tamanhoPagina },
    precisaPaginar && paginacaoAberta,
  )

  const total = paginaDoGrupo.data?.total ?? grupo.total
  const totalPaginas = Math.max(1, Math.ceil(total / tamanhoPagina))
  const mostrarPaginacao = precisaPaginar && paginacaoAberta && total > TAMANHO_PADRAO_DO_GRUPO
  const mostrarVerTodos = precisaPaginar && !paginacaoAberta

  function abrirPaginacao() {
    setPaginacaoAberta(true)
    // O botão some com o clique: o foco vai para o título do grupo, e não para o início da página.
    tituloRef.current?.focus()
  }

  function irParaPagina(novaPagina: number) {
    setPagina(novaPagina)
    // O jsdom não implementa `scrollIntoView`; o navegador sempre tem.
    secaoRef.current?.scrollIntoView?.({ block: 'start' })
  }

  function mudarTamanho(novoTamanho: number) {
    setTamanhoPagina(novoTamanho)
    setPagina(1)
  }

  function renderizarItens() {
    if (!precisaPaginar || !paginacaoAberta) return <ListaDeCartoes itens={grupo.itens} />

    if (paginaDoGrupo.isError) {
      const mensagem =
        isAxiosError(paginaDoGrupo.error) && paginaDoGrupo.error.response?.status === 429
          ? 'Muitas buscas em pouco tempo. Aguarde alguns segundos.'
          : 'Não foi possível carregar esta página de resultados.'
      const erro = <ErrorState message={mensagem} onRetry={() => void paginaDoGrupo.refetch()} />

      // Na primeira página, a falha não apaga o que já veio na busca.
      if (pagina !== 1) return erro
      return (
        <>
          <ListaDeCartoes itens={grupo.itens} />
          {erro}
        </>
      )
    }

    if (paginaDoGrupo.data) return <ListaDeCartoes itens={paginaDoGrupo.data.itens} />

    // A primeira página já tem os itens que vieram na busca: ficam na tela enquanto o resto chega.
    if (pagina === 1) return <ListaDeCartoes itens={grupo.itens} />

    if (paginaDoGrupo.isPending && paginaDoGrupo.fetchStatus !== 'idle') {
      return <CarregandoPagina rotulo={grupo.rotulo} />
    }

    return <p className="text-sm text-muted">Nenhum resultado nesta página.</p>
  }

  return (
    <section
      ref={secaoRef}
      aria-labelledby={tituloGrupoId}
      className="flex scroll-mt-24 flex-col gap-3"
    >
      <h2
        id={tituloGrupoId}
        ref={tituloRef}
        tabIndex={-1}
        className="text-subtitulo font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
      >
        {grupo.rotulo} <span className="text-sm font-normal text-muted">({total})</span>
      </h2>

      {renderizarItens()}

      {mostrarVerTodos && (
        <button
          type="button"
          onClick={abrirPaginacao}
          className="self-start py-1 text-sm font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
        >
          Ver os {grupo.total} {grupo.rotulo.toLowerCase()}
        </button>
      )}

      {mostrarPaginacao && (
        <Pagination
          ariaLabel={`Páginas de ${grupo.rotulo}`}
          page={pagina}
          pageSize={tamanhoPagina}
          totalCount={total}
          totalPages={totalPaginas}
          pageSizeOptions={TAMANHOS_DE_PAGINA_DO_GRUPO}
          onPageChange={irParaPagina}
          onPageSizeChange={mudarTamanho}
        />
      )}
    </section>
  )
}
