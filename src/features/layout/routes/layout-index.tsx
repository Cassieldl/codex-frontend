import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import { AtalhosDeVersao } from '../components/AtalhosDeVersao'
import { AvisoVocabulario } from '../components/AvisoVocabulario'
import { CartoesDeVersaoDoLayout } from '../components/CartoesDeVersaoDoLayout'
import { MarcosDaVersao } from '../components/MarcosDaVersao'
import { NovidadesDaVigente } from '../components/NovidadesDaVigente'
import { useLayoutIndice } from '../hooks/useLayoutIndice'

const CLASSE_LARGURA = 'mx-auto w-full max-w-pagina px-4 lg:px-8'

/**
 * `/layout` (tela 6, índice): a porta de entrada do Layout InvoiCy. Na ordem: cabeçalho com o
 * atalho para cada versão, prazo da vigente, o que ela mudou e o dicionário por versão. O
 * dicionário em si vive em `/layout/{versaoSlug}`, porque cada versão é uma URL própria.
 */
export function LayoutIndicePage() {
  const { data: indice, isLoading, isError, refetch } = useLayoutIndice()

  useTituloDaPagina('Layout InvoiCy')

  const semVersoes = !!indice && indice.versoes.length === 0 && indice.vigente === null
  const comVersoes = !isLoading && !isError && !!indice && !semVersoes

  return (
    <div className="flex min-h-screen flex-col bg-surface-hover">
      <CabecalhoPublico />

      <main id={ID_CONTEUDO_PRINCIPAL} tabIndex={-1} className="flex flex-1 flex-col">
        <div className="border-b border-border bg-white">
          <div
            className={`${CLASSE_LARGURA} flex flex-wrap items-end justify-between gap-x-10 gap-y-5 py-8`}
          >
            <div className="flex max-w-prose flex-col gap-2">
              <h1 className="text-titulo font-extrabold text-primary lg:text-h1">Layout InvoiCy</h1>
              <p className="text-sm text-muted">
                Consulte o nome, o caminho e o significado de cada campo que você envia ao InvoiCy.
              </p>
              <AvisoVocabulario />
            </div>

            {comVersoes && (
              <AtalhosDeVersao
                versoes={indice.versoes}
                vigenteSlug={indice.vigente?.slug ?? null}
              />
            )}
          </div>
        </div>

        <div className={`${CLASSE_LARGURA} flex flex-col gap-7 py-8`}>
          {isLoading && (
            <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
              <span className="sr-only">Carregando as versões do Layout InvoiCy…</span>
              <Skeleton className="h-6 w-64" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          )}

          {isError && <ErrorState onRetry={() => refetch()} />}

          {!isLoading && !isError && semVersoes && (
            <EmptyState message="As versões do Layout InvoiCy estarão disponíveis em breve." />
          )}

          {comVersoes && indice.vigente && (
            <MarcosDaVersao versaoRotulo={indice.vigente.rotulo} marcos={indice.vigente} />
          )}

          {comVersoes && indice.novidades && <NovidadesDaVigente novidades={indice.novidades} />}

          {comVersoes && (
            <section aria-labelledby="versoes-layout-titulo" className="flex flex-col gap-3">
              <h2 id="versoes-layout-titulo" className="text-secao font-extrabold text-primary">
                Dicionário por versão
              </h2>
              <p className="text-sm text-muted">
                Versões anteriores continuam disponíveis para consulta.
              </p>

              <CartoesDeVersaoDoLayout indice={indice} />
            </section>
          )}
        </div>
      </main>

      <RodapeContextual contexto={{ tipo: 'layout' }} />
    </div>
  )
}
