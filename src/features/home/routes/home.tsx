import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { ArtigosRecentesHome } from '../components/ArtigosRecentesHome'
import { BlocoLayoutHome } from '../components/BlocoLayoutHome'
import { BuscaHeroComPreview } from '../components/BuscaHeroComPreview'
import { FaixaComunicadoCritico } from '../components/FaixaComunicadoCritico'
import { ListaProvedoresHome } from '../components/ListaProvedoresHome'
import { ResumoComunicados } from '../components/ResumoComunicados'
import { SeletorProvedorVersao } from '../components/SeletorProvedorVersao'
import { SkeletonHome } from '../components/SkeletonHome'
import { useHome } from '../hooks/useHome'

export interface HomePageProps {
  /**
   * Injetado pela rota fina (`src/routes/index.tsx`), que usa
   * `Route.useNavigate()` de verdade — manter como prop deixa o Enter da busca
   * testável sem montar a árvore de rotas gerada.
   */
  navegarParaBusca: (termo: string) => void
}

/**
 * `/` — Home (tela 1), servida por um único agregador (`GET /home`, P9).
 *
 * **Decisão de composição:** o hero de busca fica FORA do `useHome()`. A busca
 * é a porta de entrada do produto e consome outro endpoint (P1); derrubá-la
 * porque o agregador falhou transformaria uma vitrine indisponível numa
 * ferramenta indisponível. Por isso cabeçalho, campo de busca e rodapé
 * renderizam nos três estados, e só o miolo troca entre esqueleto, erro e
 * conteúdo.
 */
export function HomePage({ navegarParaBusca }: HomePageProps) {
  const { data: home, isLoading, isError, refetch } = useHome()

  const provedores = (home?.provedoresPorCategoria ?? []).flatMap(
    (categoria) => categoria.provedores,
  )
  const semProvedores = home !== undefined && provedores.length === 0

  return (
    <div className="flex min-h-screen flex-col">
      {home && <FaixaComunicadoCritico comunicados={home.comunicados} />}

      <CabecalhoPublico variante="destaque">
        <div className="flex flex-col gap-1.5">
          <h1 className="max-w-[34ch] text-titulo font-extrabold leading-tight text-white">
            Como cada provedor de NFS-e trata cada campo do Layout InvoiCy
          </h1>
          <p className="max-w-[88ch] text-sm text-white/90">
            Tipo, tamanho, máscara, obrigatoriedade, destino no XML e erros conhecidos — por
            provedor e por versão.
          </p>
          <div className="mt-4">
            <BuscaHeroComPreview aoSubmeter={navegarParaBusca} />
          </div>
        </div>
      </CabecalhoPublico>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-11 px-4 py-10 lg:px-8">
        {isLoading && <SkeletonHome />}

        {/* Com dado em cache, um refetch de fundo que falha não pode trocar a
            página por uma tela de erro — nem exibir as duas coisas juntas. */}
        {isError && !home && <ErrorState onRetry={() => refetch()} />}

        {home && (
          <>
            <section aria-labelledby="secao-provedores-home" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-8">
                <div className="flex flex-col gap-1">
                  <h2 id="secao-provedores-home" className="text-titulo font-extrabold text-ink">
                    Provedores
                  </h2>
                  <p className="text-sm text-muted">Cada versão publicada é destino direto.</p>
                </div>

                {provedores.length > 0 && <SeletorProvedorVersao provedores={provedores} />}
              </div>

              <ResumoComunicados comunicados={home.comunicados} />

              {semProvedores ? (
                <EmptyState message="Nenhum provedor publicado ainda." />
              ) : (
                <ListaProvedoresHome categorias={home.provedoresPorCategoria} />
              )}
            </section>

            <BlocoLayoutHome layout={home.layout} />

            <ArtigosRecentesHome artigos={home.artigosRecentes} />
          </>
        )}
      </main>

      <RodapeContextual contexto={{ tipo: 'home' }} />
    </div>
  )
}
