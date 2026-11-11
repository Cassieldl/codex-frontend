import { Link, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { corrigirUrlCanonica, type NavegacaoCanonica } from '../../../utils/corrigirUrlCanonica'
import { ComunicadosDoContexto } from '../../comunicados/components/ComunicadosDoContexto'
import { AvisosProvedor } from '../components/AvisosProvedor'
import { EstadoProvedorIndisponivel } from '../components/EstadoProvedorIndisponivel'
import { ErroProvedorHttp, useProvedorPorSlug } from '../hooks/useProvedorPorSlug'
import { ID_AREA_AVISOS, useRolarParaAreaDeAvisos } from '../utils/avisoAncora'
import { caminhoDoProvedor } from '../utils/caminhoDoProvedor'

export interface ProvedorLayoutPageProps {
  provedorSlug: string
  /**
   * Caminho em que a página está sendo servida, montado pela rota a partir
   * dos parâmetros, nunca da localização do router (ver `provedor-layout-rota.tsx`).
   * Compara-se com o canônico devolvido por P3 para decidir o redirect
   * (PQ-01/F2, `arquitetura.md` §5.F).
   */
  caminhoAtual: string
  navegar: (opcoes: NavegacaoCanonica) => void
}

/**
 * Moldura de `/provedores/{provedorSlug}`: cabeçalho, comunicados e avisos do provedor, com o
 * conteúdo da versão publicada no `Outlet`. Também corrige a URL quando o slug do provedor mudou
 * (`arquitetura.md` §5.F).
 */
export function ProvedorLayoutPage({
  provedorSlug,
  caminhoAtual,
  navegar,
}: ProvedorLayoutPageProps) {
  const { data: provedor, isLoading, isError, error, refetch } = useProvedorPorSlug(provedorSlug)

  const erroTipado = error instanceof ErroProvedorHttp ? error : null

  const caminhoCanonico = provedor ? caminhoDoProvedor(provedor.slug) : null
  const correcao = caminhoCanonico ? corrigirUrlCanonica(caminhoAtual, caminhoCanonico) : null

  useEffect(() => {
    if (correcao) navegar(correcao)
  }, [correcao, navegar])

  const conteudoPronto = !isLoading && !isError && provedor !== undefined && !correcao
  useRolarParaAreaDeAvisos(conteudoPronto)

  // A versão publicada é uma só e P3 a entrega primeiro: ela traz os comunicados de escopo versão.
  const versaoPublicadaSlug = provedor?.versoes[0]?.slug

  return (
    <div className="flex min-h-screen flex-col bg-surface-hover">
      <CabecalhoPublico />

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8"
      >
        {(isLoading || correcao) && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">
              {correcao ? 'Abrindo o endereço oficial do provedor…' : 'Carregando provedor…'}
            </span>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && erroTipado?.tipo === 'despublicado' && (
          <EstadoProvedorIndisponivel variante="provedor-despublicado" />
        )}

        {isError && erroTipado?.tipo === 'nao_encontrado' && (
          <EstadoProvedorIndisponivel variante="provedor-nao-encontrado" />
        )}

        {/* Sobra só o que insistir pode resolver: rede, 5xx, erro não classificado. */}
        {isError && !erroTipado && <ErrorState onRetry={() => refetch()} />}

        {conteudoPronto && (
          <>
            <div>
              <p className="text-xs text-muted">
                <Link to="/provedores" search={{ pagina: 1 }} className="hover:underline">
                  Provedores
                </Link>{' '}
                / {provedor.nome}
              </p>
              <h1 className="text-titulo font-bold text-ink">{provedor.nome}</h1>
              <p className="text-sm text-muted">
                {provedor.categoria === 'Nacional' ? 'Nacional' : 'Próprio'}
              </p>
            </div>

            <ComunicadosDoContexto
              provedorSlugs={[provedorSlug]}
              versaoSlug={versaoPublicadaSlug}
              caminhoAtual={caminhoAtual}
            />

            <div id={ID_AREA_AVISOS} className="flex flex-col gap-6">
              <AvisosProvedor nomeProvedor={provedor.nome} avisos={provedor.avisos} />

              <Outlet />
            </div>
          </>
        )}
      </main>

      <RodapeContextual contexto={{ tipo: 'provedor', provedorSlug }} />
    </div>
  )
}
