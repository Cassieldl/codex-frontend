import { Link, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { BarraDeSecoes } from '../../../components/ui/BarraDeSecoes'
import { BlocoRecolhivel } from '../../../components/ui/BlocoRecolhivel'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { corrigirUrlCanonica, type NavegacaoCanonica } from '../../../utils/corrigirUrlCanonica'
import { ComunicadosDoContexto } from '../../comunicados/components/ComunicadosDoContexto'
import { AvisosProvedor } from '../components/AvisosProvedor'
import { EstadoProvedorIndisponivel } from '../components/EstadoProvedorIndisponivel'
import { FatosDoProvedor } from '../components/FatosDoProvedor'
import { ErroProvedorHttp, useProvedorPorSlug } from '../hooks/useProvedorPorSlug'
import { useVersaoProvedor } from '../hooks/useVersaoProvedor'
import type { ProvedorDetalhe } from '../types/provedor'
import { ID_AREA_AVISOS, useRolarParaAreaDeAvisos } from '../utils/avisoAncora'
import { caminhoDoProvedor } from '../utils/caminhoDoProvedor'
import { montarSecoesDoProvedor } from '../utils/secoesDoProvedor'

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

interface ConteudoDoProvedorProps {
  provedor: ProvedorDetalhe
  provedorSlug: string
  caminhoAtual: string
}

/**
 * Topo da página, barra de seções e avisos do provedor. A versão publicada é uma só e P3 a entrega
 * primeiro. O conteúdo dela vem pela mesma chave de consulta do `Outlet`, então a moldura lê o que
 * a página da versão já buscou, sem requisição a mais.
 */
function ConteudoDoProvedor({ provedor, provedorSlug, caminhoAtual }: ConteudoDoProvedorProps) {
  const versaoPublicada = provedor.versoes[0]
  const { data: versaoPagina } = useVersaoProvedor(provedorSlug, versaoPublicada?.slug ?? '')

  const secoes = versaoPagina ? montarSecoesDoProvedor(provedor.avisos.length, versaoPagina) : []
  const introducao = versaoPagina?.versao.introducao

  return (
    <>
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs text-muted">
            <Link to="/provedores" search={{ pagina: 1 }} className="hover:underline">
              Provedores
            </Link>{' '}
            / {provedor.nome}
          </p>
          <h1 className="text-titulo font-bold text-ink">{provedor.nome}</h1>
        </div>

        <FatosDoProvedor
          categoria={provedor.categoria}
          versaoRotulo={versaoPublicada?.rotulo}
          verificadoEm={versaoPublicada?.verificadoEm}
          versaoLayoutRotulo={versaoPagina?.versao.versaoLayoutRotulo}
        />

        {introducao && (
          <BlocoRecolhivel titulo="Detalhes da fonte">
            <p className="text-sm text-ink">{introducao}</p>
          </BlocoRecolhivel>
        )}
      </div>

      <ComunicadosDoContexto
        provedorSlugs={[provedorSlug]}
        versaoSlug={versaoPublicada?.slug}
        caminhoAtual={caminhoAtual}
      />

      <BarraDeSecoes secoes={secoes} rotuloAria="Seções do provedor" />

      <div id={ID_AREA_AVISOS} className="flex scroll-mt-24 flex-col gap-6">
        <AvisosProvedor nomeProvedor={provedor.nome} avisos={provedor.avisos} />

        <Outlet />
      </div>
    </>
  )
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

  return (
    <div className="flex min-h-screen flex-col bg-surface-hover">
      <CabecalhoPublico />

      {/* `--topo-fixo` desce os elementos presos da tabela de campos para baixo da barra de seções. */}
      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 [--topo-fixo:var(--altura-barra-secoes)] lg:px-8"
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
          <ConteudoDoProvedor
            provedor={provedor}
            provedorSlug={provedorSlug}
            caminhoAtual={caminhoAtual}
          />
        )}
      </main>

      <RodapeContextual contexto={{ tipo: 'provedor', provedorSlug }} />
    </div>
  )
}
