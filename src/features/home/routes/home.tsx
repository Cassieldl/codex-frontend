import { useState } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Input } from '../../../components/ui/Input'
import { PontoDeMarca } from '../../../components/ui/PontoDeMarca'
import { Sobrelinha } from '../../../components/ui/Sobrelinha'
import { TituloSecao } from '../../../components/ui/TituloSecao'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import { ArtigosRecentesHome } from '../components/ArtigosRecentesHome'
import { AtalhosDeBusca } from '../components/AtalhosDeBusca'
import { BlocoLayoutHome } from '../components/BlocoLayoutHome'
import { BuscaHeroComPreview } from '../components/BuscaHeroComPreview'
import { CardsDeEntradaHome } from '../components/CardsDeEntradaHome'
import { FaixaComunicadoCritico } from '../components/FaixaComunicadoCritico'
import { ListaProvedoresHome } from '../components/ListaProvedoresHome'
import { ResumoComunicados } from '../components/ResumoComunicados'
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
const ID_SECAO_PROVEDORES = 'provedores'

export function HomePage({ navegarParaBusca }: HomePageProps) {
  const { data: home, isLoading, isError, refetch } = useHome()
  const [filtroProvedores, setFiltroProvedores] = useState('')

  useTituloDaPagina('Início')

  const totalProvedores = (home?.provedoresPorCategoria ?? []).reduce(
    (soma, categoria) => soma + categoria.provedores.length,
    0,
  )
  const semProvedores = home !== undefined && totalProvedores === 0

  return (
    <div className="flex min-h-screen flex-col bg-surface-hover">
      {home && <FaixaComunicadoCritico comunicados={home.comunicados} />}

      <CabecalhoPublico>
        <div className="flex flex-col gap-3 pb-16">
          <Sobrelinha>Portal técnico de integração NFS-e</Sobrelinha>
          <h1 className="max-w-[30ch] text-titulo leading-tight font-extrabold text-white lg:text-h1">
            Como cada provedor de NFS-e trata cada campo do Layout InvoiCy
            <PontoDeMarca />
          </h1>
          <p className="max-w-[88ch] text-card-titulo text-white">
            Tipo, tamanho, máscara, obrigatoriedade, destino no XML e erros conhecidos, por
            provedor.
          </p>
          <div className="mt-5 flex flex-col gap-4">
            <BuscaHeroComPreview aoSubmeter={navegarParaBusca} />
            <AtalhosDeBusca />
          </div>
        </div>
      </CabecalhoPublico>

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-pagina flex-1 flex-col gap-16 px-4 pb-16 lg:px-8"
      >
        {/* Os cards de entrada sobem sobre o hero e aparecem nos três estados: não dependem do agregador. */}
        <section
          aria-label="O que você precisa fazer?"
          className="relative -mt-16 grid gap-5 md:grid-cols-3"
        >
          <CardsDeEntradaHome idSecaoProvedores={ID_SECAO_PROVEDORES} />
          {home && <BlocoLayoutHome layout={home.layout} />}
        </section>

        {isLoading && <SkeletonHome />}

        {/* Com dado em cache, um refetch de fundo que falha não pode trocar a
            página por uma tela de erro, nem exibir as duas coisas juntas. */}
        {isError && !home && <ErrorState onRetry={() => refetch()} />}

        {home && (
          <>
            <section
              id={ID_SECAO_PROVEDORES}
              aria-labelledby="secao-provedores-home"
              className="flex scroll-mt-6 flex-col gap-5"
            >
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="flex flex-col gap-1">
                  <TituloSecao id="secao-provedores-home">Provedores</TituloSecao>
                  <p className="text-sm text-muted">
                    Escolha o seu provedor para ver erros, campos e avisos.
                  </p>
                </div>

                {totalProvedores > 0 && (
                  <div className="w-full sm:w-80">
                    <Input
                      label="Filtrar provedores"
                      type="search"
                      placeholder="Ex.: Betha"
                      value={filtroProvedores}
                      onChange={(evento) => setFiltroProvedores(evento.target.value)}
                    />
                  </div>
                )}
              </div>

              <ResumoComunicados comunicados={home.comunicados} />

              {semProvedores ? (
                <EmptyState message="Nenhum provedor disponível. Use a busca para encontrar erros e campos do Layout InvoiCy." />
              ) : (
                <ListaProvedoresHome
                  categorias={home.provedoresPorCategoria}
                  filtro={filtroProvedores}
                />
              )}
            </section>

            <ArtigosRecentesHome artigos={home.artigosRecentes} />
          </>
        )}
      </main>

      <RodapeContextual
        contexto={{ tipo: 'home' }}
        versaoVigenteDoLayout={home?.layout?.vigente?.rotulo}
      />
    </div>
  )
}
