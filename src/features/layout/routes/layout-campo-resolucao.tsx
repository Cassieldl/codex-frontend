import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { construirIdLinhaCampo } from '../../provedores/utils/destaqueAncora'
import { ErroCampoLayoutHttp, useCampoLayoutPorSlug } from '../hooks/useCampoLayoutPorSlug'

/**
 * Destino do redirect (A3). `replace: true` é parte do contrato desta tela: a
 * resolução é um trampolim, e empilhar histórico faria o "voltar" do navegador
 * cair de novo nela, num laço.
 */
export interface NavegacaoCampoLayout {
  to: '/layout/$versaoSlug'
  params: { versaoSlug: string }
  hash: string
  replace: true
}

export interface LayoutCampoResolucaoPageProps {
  campoSlug: string
  navegar: (opcoes: NavegacaoCampoLayout) => void
}

/**
 * `/layout/campos/{campoSlug}` — a URL **canônica e estável** de um campo
 * (A3). A página não tem conteúdo próprio: pergunta ao backend em que versão o
 * verbete deve ser aberto e redireciona para
 * `/layout/{versaoExibicao.slug}#campo-{campoSlug}`.
 *
 * Só `versaoExibicao.slug` decide o destino. `ondeEUsado` vem na resposta e
 * **nunca é lido aqui** (F-2): a regra de qual versão exibir é do backend, um
 * lugar só, e derivá-la do uso em provedores seria uma segunda regra
 * divergindo em silêncio.
 */
export function LayoutCampoResolucaoPage({ campoSlug, navegar }: LayoutCampoResolucaoPageProps) {
  const { data: verbete, isLoading, isError, error, refetch } = useCampoLayoutPorSlug(campoSlug)

  useEffect(() => {
    if (!verbete) return

    navegar({
      to: '/layout/$versaoSlug',
      params: { versaoSlug: verbete.versaoExibicao.slug },
      hash: construirIdLinhaCampo(campoSlug),
      replace: true,
    })
  }, [verbete, campoSlug, navegar])

  const erroTipado = error instanceof ErroCampoLayoutHttp ? error : null

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8">
        {(isLoading || verbete) && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">Localizando o campo no Layout InvoiCy…</span>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {isError && erroTipado?.tipo === 'nao_encontrado' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <h1 className="text-subtitulo font-semibold text-ink">
              Este campo não existe no Layout InvoiCy.
            </h1>
            <Link
              to="/layout"
              activeOptions={{ exact: true }}
              className="text-sm font-semibold text-primary-medium hover:underline"
            >
              Ver as versões do Layout InvoiCy
            </Link>
          </div>
        )}

        {isError && erroTipado?.tipo === 'campo_despublicado' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <h1 className="text-subtitulo font-semibold text-ink">Este campo saiu do ar.</h1>
            <p className="text-sm text-ink/60">
              O verbete deste campo não está mais disponível publicamente.
            </p>
            <Link
              to="/layout"
              activeOptions={{ exact: true }}
              className="text-sm font-semibold text-primary-medium hover:underline"
            >
              Ver as versões publicadas
            </Link>
          </div>
        )}

        {isError && !erroTipado && <ErrorState onRetry={() => refetch()} />}
      </main>

      <RodapeContextual contexto={{ tipo: 'layout-campo' }} />
    </div>
  )
}
