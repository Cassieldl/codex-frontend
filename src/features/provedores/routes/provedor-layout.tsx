import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useState } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { AbasNavegaveis, type AbaNavegavel } from '../../../components/ui/AbasNavegaveis'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { cn } from '../../../lib/cn'
import { corrigirUrlCanonica, type NavegacaoCanonica } from '../../../utils/corrigirUrlCanonica'
import { ComunicadosDoContexto } from '../../comunicados/components/ComunicadosDoContexto'
import { EstadoProvedorIndisponivel } from '../components/EstadoProvedorIndisponivel'
import { FaixaLayoutDesatualizado } from '../components/FaixaLayoutDesatualizado'
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

/** Largura útil das páginas públicas: a faixa do cabeçalho ocupa a tela, o conteúdo não. */
const CLASSE_LARGURA = 'mx-auto w-full max-w-pagina px-4 lg:px-8'

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

  const idDoPainelDaFonte = useId()
  const [fonteAberta, setFonteAberta] = useState(false)

  const abas = versaoPagina ? montarAbas(provedorSlug, abaAtual, versaoPagina) : []
  const introducao = versaoPagina?.versao.introducao
  const versaoLayoutRotulo = versaoPagina?.versao.versaoLayoutRotulo

  return (
    <>
      <div className="border-b border-border bg-white">
        <div
          className={cn(CLASSE_LARGURA, 'flex flex-col gap-4 pt-6', abas.length === 0 && 'pb-6')}
        >
          <p className="text-xs text-muted">
            <Link to="/provedores" search={{ pagina: 1 }} className="underline hover:text-ink">
              Provedores
            </Link>{' '}
            / {provedor.nome}
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <h1 className="text-titulo font-extrabold text-primary lg:text-h1">{provedor.nome}</h1>
            <FatosDoProvedor
              categoria={provedor.categoria}
              versaoRotulo={versaoPublicada?.rotulo}
              verificadoEm={versaoPublicada?.verificadoEm}
              versaoLayoutRotulo={versaoLayoutRotulo}
              fonte={
                introducao
                  ? {
                      aberta: fonteAberta,
                      idDoPainel: idDoPainelDaFonte,
                      aoAlternar: () => setFonteAberta((aberta) => !aberta),
                    }
                  : undefined
              }
            />
          </div>

          {introducao && (
            <div
              id={idDoPainelDaFonte}
              hidden={!fonteAberta}
              className="rounded-[var(--radius-control)] border border-border bg-surface-hover px-4 py-3"
            >
              <p className="text-xs font-semibold text-muted">Fonte</p>
              <p className="text-sm text-ink">{introducao}</p>
            </div>
          )}

          {versaoLayoutRotulo && (
            <FaixaLayoutDesatualizado versaoLayoutRotulo={versaoLayoutRotulo} />
          )}

          <ComunicadosDoContexto
            provedorSlugs={[provedorSlug]}
            versaoSlug={versaoPublicada?.slug}
            caminhoAtual={caminhoAtual}
          />

          {abas.length > 0 && (
            <AbasNavegaveis abas={abas} ariaLabel="Seções do provedor" tamanho="destaque" />
          )}
        </div>
      </div>

      <div className={cn(CLASSE_LARGURA, 'flex flex-1 flex-col gap-6 py-7')}>
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

  return (
    <div className="flex min-h-screen flex-col bg-surface-hover">
      <CabecalhoPublico />

      <main id={ID_CONTEUDO_PRINCIPAL} tabIndex={-1} className="flex w-full flex-1 flex-col">
        {!conteudoPronto && (
          <div className={cn(CLASSE_LARGURA, 'flex flex-col gap-6 py-8')}>
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
          </div>
        )}

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
