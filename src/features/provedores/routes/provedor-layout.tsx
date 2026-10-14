import { Link, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { AbasNavegaveis, type AbaNavegavel } from '../../../components/ui/AbasNavegaveis'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { corrigirUrlCanonica, type NavegacaoCanonica } from '../../../utils/corrigirUrlCanonica'
import { ComunicadosDoContexto } from '../../comunicados/components/ComunicadosDoContexto'
import { AvisosProvedor } from '../components/AvisosProvedor'
import { EstadoProvedorIndisponivel } from '../components/EstadoProvedorIndisponivel'
import { ErroProvedorHttp, useProvedorPorSlug } from '../hooks/useProvedorPorSlug'
import { caminhoDoProvedor } from '../utils/caminhoDoProvedor'

export interface ProvedorLayoutPageProps {
  provedorSlug: string
  /**
   * Segmento de versão após `/provedores/{provedorSlug}/` na URL atual, se
   * houver — usado para marcar a aba ativa e para preservar a versão que o
   * usuário estava vendo ao corrigir o slug do provedor (§2.3).
   */
  versaoSlugAtual: string | undefined
  /**
   * Caminho em que a página está sendo servida — montado pela rota a partir
   * dos parâmetros, nunca da localização do router (ver `provedor-layout-rota.tsx`).
   * Compara-se com o canônico devolvido por P3 para decidir o redirect
   * (PQ-01/F2, `arquitetura.md` §5.F).
   */
  caminhoAtual: string
  navegar: (opcoes: NavegacaoCanonica) => void
}

/**
 * Layout compartilhado de `/provedores/{provedorSlug}` e suas sub-rotas
 * (índice de versão e versão aberta). Ganha a comparação de canônico e o
 * redirect, preservando o segmento de versão quando presente (§2.3,
 * `arquitetura.md` §5.F) — trocar o slug do provedor não pode derrubar a
 * aba de versão que o usuário estava vendo.
 */
export function ProvedorLayoutPage({
  provedorSlug,
  versaoSlugAtual,
  caminhoAtual,
  navegar,
}: ProvedorLayoutPageProps) {
  const { data: provedor, isLoading, isError, error, refetch } = useProvedorPorSlug(provedorSlug)

  const erroTipado = error instanceof ErroProvedorHttp ? error : null

  const caminhoCanonico = provedor ? caminhoDoProvedor(provedor.slug, versaoSlugAtual) : null
  const correcao = caminhoCanonico ? corrigirUrlCanonica(caminhoAtual, caminhoCanonico) : null

  useEffect(() => {
    if (correcao) navegar(correcao)
  }, [correcao, navegar])

  return (
    <div className="flex min-h-screen flex-col">
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

        {!isLoading && !isError && provedor && !correcao && (
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
              versaoSlug={versaoSlugAtual}
              caminhoAtual={caminhoAtual}
            />

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
