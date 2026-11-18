import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { AbasNavegaveis, type AbaNavegavel } from '../../../components/ui/AbasNavegaveis'
import { BlocoRecolhivel } from '../../../components/ui/BlocoRecolhivel'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { corrigirUrlCanonica, type NavegacaoCanonica } from '../../../utils/corrigirUrlCanonica'
import { ComunicadosDoContexto } from '../../comunicados/components/ComunicadosDoContexto'
import { EstadoProvedorIndisponivel } from '../components/EstadoProvedorIndisponivel'
import { FatosDoProvedor } from '../components/FatosDoProvedor'
import { ErroProvedorHttp, useProvedorPorSlug } from '../hooks/useProvedorPorSlug'
import { useVersaoProvedor } from '../hooks/useVersaoProvedor'
import type { ProvedorDetalhe } from '../types/provedor'
import type { VersaoProvedorPagina } from '../types/versaoProvedorPagina'
import { abaDoCaminho, abaDoHash, ROTA_DA_ABA, type AbaProvedor } from '../utils/abasDoProvedor'
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

interface ConteudoDoProvedorProps {
  provedor: ProvedorDetalhe
  provedorSlug: string
  caminhoAtual: string
}

function montarAbas(
  provedorSlug: string,
  abaAtual: AbaProvedor | null,
  versao: VersaoProvedorPagina,
): AbaNavegavel[] {
  const abas: { aba: AbaProvedor; rotulo: string; contador?: number }[] = [
    { aba: 'erros', rotulo: 'Erros conhecidos', contador: versao.errosResumo.total },
    { aba: 'campos', rotulo: 'Campos', contador: versao.totalCampos },
    { aba: 'natureza', rotulo: 'Natureza da operação', contador: versao.naturezasOperacao.length },
    { aba: 'envio', rotulo: 'Envio modelo' },
  ]

  return abas
    .filter(({ aba, contador }) => aba !== 'natureza' || (contador ?? 0) > 0)
    .map(({ aba, rotulo, contador }) => ({
      rotulo,
      contador,
      to: ROTA_DA_ABA[aba],
      params: { provedorSlug },
      ativa: aba === abaAtual,
    }))
}

/**
 * Âncora de antes das abas (`#campo-x` na raiz do provedor) troca para a aba dona dela, mantendo a
 * âncora e substituindo a entrada do histórico: o Voltar não cai de novo no endereço antigo.
 */
function useLevarAncoraParaAba(provedorSlug: string, abaAtual: AbaProvedor | null) {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const abaDaAncora = abaDoHash(hash)

  useEffect(() => {
    if (abaAtual === null || abaDaAncora === null || abaDaAncora === abaAtual) return

    void navigate({
      to: ROTA_DA_ABA[abaDaAncora],
      params: { provedorSlug },
      hash,
      replace: true,
    })
  }, [abaAtual, abaDaAncora, hash, navigate, provedorSlug])
}

/**
 * Topo da página e abas do provedor. A versão publicada é uma só e P3 a entrega primeiro. O
 * conteúdo dela vem pela mesma chave de consulta do `Outlet`, então a moldura lê o que a aba já
 * buscou, sem requisição a mais.
 */
function ConteudoDoProvedor({ provedor, provedorSlug, caminhoAtual }: ConteudoDoProvedorProps) {
  const versaoPublicada = provedor.versoes[0]
  const { data: versaoPagina } = useVersaoProvedor(provedorSlug, versaoPublicada?.slug ?? '')
  const { pathname } = useLocation()
  const abaAtual = abaDoCaminho(pathname, caminhoDoProvedor(provedorSlug))

  useLevarAncoraParaAba(provedorSlug, abaAtual)

  const abas = versaoPagina ? montarAbas(provedorSlug, abaAtual, versaoPagina) : []
  const introducao = versaoPagina?.versao.introducao

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted">
          <Link to="/provedores" search={{ pagina: 1 }} className="underline hover:text-ink">
            Provedores
          </Link>{' '}
          / {provedor.nome}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-titulo font-extrabold text-primary lg:text-h1">{provedor.nome}</h1>
          <FatosDoProvedor
            categoria={provedor.categoria}
            versaoRotulo={versaoPublicada?.rotulo}
            verificadoEm={versaoPublicada?.verificadoEm}
            versaoLayoutRotulo={versaoPagina?.versao.versaoLayoutRotulo}
          />
        </div>

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

      {abas.length > 0 && <AbasNavegaveis abas={abas} ariaLabel="Seções do provedor" />}

      <Outlet />
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
