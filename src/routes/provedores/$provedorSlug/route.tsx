import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { AbasNavegaveis, type AbaNavegavel } from '../../../components/ui/AbasNavegaveis'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { AvisosProvedor } from '../../../features/provedores/components/AvisosProvedor'
import {
  ErroProvedorHttp,
  useProvedorPorSlug,
} from '../../../features/provedores/hooks/useProvedorPorSlug'

export const Route = createFileRoute('/provedores/$provedorSlug')({
  component: ProvedorLayout,
})

/**
 * Segmento após `/provedores/{provedorSlug}/` na URL atual, se houver — usado
 * só para marcar a aba ativa em `AbasNavegaveis` e escolher o contexto do
 * rodapé. Nunca usado para decidir o que buscar: cada sub-rota já busca os
 * próprios dados (P4 tem hook e queryKey próprios).
 */
function useVersaoSlugAtual(): string | undefined {
  const location = useLocation()
  const segmentos = location.pathname.split('/').filter(Boolean)
  return segmentos[2]
}

function ProvedorLayout() {
  const { provedorSlug } = Route.useParams()
  const versaoSlugAtual = useVersaoSlugAtual()
  const { data: provedor, isLoading, isError, error, refetch } = useProvedorPorSlug(provedorSlug)

  const erroTipado = error instanceof ErroProvedorHttp ? error : null

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8">
        {isLoading && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">Carregando provedor…</span>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && erroTipado?.tipo === 'despublicado' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <h1 className="text-subtitulo font-semibold text-ink">Este provedor saiu do ar.</h1>
            <p className="text-sm text-ink/60">
              O conteúdo deste provedor não está mais disponível publicamente.
            </p>
          </div>
        )}

        {isError && erroTipado?.tipo !== 'despublicado' && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !isError && provedor && (
          <>
            <div>
              <p className="text-xs text-ink/50">
                <Link to="/provedores" search={{ pagina: 1 }} className="hover:underline">
                  Provedores
                </Link>{' '}
                / {provedor.nome}
              </p>
              <h1 className="text-titulo font-bold text-ink">{provedor.nome}</h1>
              <p className="text-sm text-ink/60">
                {provedor.categoria === 'Nacional' ? 'Nacional' : 'Próprio'}
              </p>
            </div>

            <AvisosProvedor nomeProvedor={provedor.nome} avisos={provedor.avisos} />

            {provedor.versoes.length > 0 && (
              <AbasNavegaveis
                ariaLabel="Versões do provedor"
                abas={provedor.versoes.map((versao): AbaNavegavel => ({
                  rotulo: versao.rotulo,
                  to: '/provedores/$provedorSlug/$versaoSlug',
                  params: { provedorSlug, versaoSlug: versao.slug },
                  ativa: versaoSlugAtual === versao.slug,
                }))}
              />
            )}

            <Outlet />
          </>
        )}
      </main>

      <RodapeContextual
        contexto={
          versaoSlugAtual
            ? { tipo: 'provedor-versao', provedorSlug }
            : { tipo: 'provedor-sem-versao' }
        }
      />
    </div>
  )
}
