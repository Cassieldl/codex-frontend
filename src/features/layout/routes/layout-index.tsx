import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { AvisoVocabulario } from '../components/AvisoVocabulario'
import { ChipVersaoLayout } from '../components/ChipVersaoLayout'
import { useLayoutIndice } from '../hooks/useLayoutIndice'
import { LEGENDA_ESTADO_VERSAO } from '../utils/estadoVersaoLayout'

/**
 * `/layout` (tela 6, índice) — a porta de entrada do Layout InvoiCy: escolher
 * a versão para abrir o dicionário. O dicionário em si vive em
 * `/layout/{versaoSlug}`, porque cada versão é uma URL própria e copiável.
 */
export function LayoutIndicePage() {
  const { data: indice, isLoading, isError, refetch } = useLayoutIndice()

  const semVersoes = !!indice && indice.versoes.length === 0 && indice.vigente === null

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-titulo font-bold text-ink">Layout InvoiCy</h1>
          <p className="max-w-prose text-sm text-ink/70">
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
            <h2 id="versoes-layout-titulo" className="text-subtitulo font-semibold text-ink">
              Versão do layout — escolha para ver o dicionário
            </h2>

            {indice.vigente && (
              <p className="text-sm text-ink/70">
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

            <p className="text-xs text-ink/60">{LEGENDA_ESTADO_VERSAO}</p>
          </section>
        )}
      </main>

      <RodapeContextual contexto={{ tipo: 'layout' }} />
    </div>
  )
}
