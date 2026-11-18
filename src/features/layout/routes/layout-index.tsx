import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import { AvisoVocabulario } from '../components/AvisoVocabulario'
import { ChipVersaoLayout } from '../components/ChipVersaoLayout'
import { MarcosDaVersao } from '../components/MarcosDaVersao'
import { NovidadesDaVigente } from '../components/NovidadesDaVigente'
import { useLayoutIndice } from '../hooks/useLayoutIndice'

/**
 * `/layout` (tela 6, índice): a porta de entrada do Layout InvoiCy. Escolher
 * a versão para abrir o dicionário. O dicionário em si vive em
 * `/layout/{versaoSlug}`, porque cada versão é uma URL própria e copiável.
 */
export function LayoutIndicePage() {
  const { data: indice, isLoading, isError, refetch } = useLayoutIndice()

  useTituloDaPagina('Layout InvoiCy')

  const semVersoes = !!indice && indice.versoes.length === 0 && indice.vigente === null

  return (
    <div className="flex min-h-screen flex-col bg-surface-hover">
      <CabecalhoPublico />

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-titulo font-extrabold text-primary lg:text-h1">Layout InvoiCy</h1>
          <p className="max-w-prose text-sm text-muted">
            O layout é o vocabulário comum do InvoiCy: nome, caminho e significado de cada campo que
            você envia. É o que permite escrever a integração uma vez e transmitir para qualquer
            provedor.
          </p>
        </div>

        <AvisoVocabulario />

        {isLoading && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">Carregando as versões do Layout InvoiCy…</span>
            <Skeleton className="h-6 w-64" />
            <div className="flex gap-3">
              <Skeleton className="h-20 w-36" />
              <Skeleton className="h-20 w-36" />
              <Skeleton className="h-20 w-36" />
            </div>
          </div>
        )}

        {isError && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !isError && semVersoes && (
          <EmptyState message="O Layout InvoiCy ainda não tem nenhuma versão publicada." />
        )}

        {!isLoading && !isError && indice && !semVersoes && (
          <section aria-labelledby="versoes-layout-titulo" className="flex flex-col gap-3">
            <h2
              id="versoes-layout-titulo"
              className="text-xs font-bold tracking-wider text-primary-medium uppercase"
            >
              Versão do layout: escolha para ver o dicionário
            </h2>

            {indice.vigente && (
              <p className="text-sm text-muted">
                Versão vigente: <strong className="font-semibold">{indice.vigente.rotulo}</strong>.
                Toda versão publicada continua acessível: provedores em produção seguem escritos
                contra versões anteriores.
              </p>
            )}

            <ul className="flex flex-wrap gap-3">
              {indice.versoes.map((versao) => (
                <li key={versao.slug}>
                  <ChipVersaoLayout versao={versao} />
                </li>
              ))}
            </ul>

            {indice.vigente && (
              <MarcosDaVersao
                versaoRotulo={indice.vigente.rotulo}
                marcos={indice.vigente}
                superficie="escura"
                className="mt-2"
              />
            )}
          </section>
        )}

        {!isLoading && !isError && indice?.novidades && (
          <NovidadesDaVigente novidades={indice.novidades} />
        )}
      </main>

      <RodapeContextual contexto={{ tipo: 'layout' }} />
    </div>
  )
}
