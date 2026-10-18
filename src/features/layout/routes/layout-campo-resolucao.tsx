import { Link } from '@tanstack/react-router'
import { ArchiveX, CircleHelp } from 'lucide-react'
import { useEffect } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { ErrorState } from '../../../components/ui/ErrorState'
import { EstadoIndisponivel } from '../../../components/ui/EstadoIndisponivel'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
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

  // Enquanto localiza e redireciona; nos erros, quem nomeia a aba é o estado de erro.
  useTituloDaPagina(isError ? null : 'Campo do Layout InvoiCy')

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8"
      >
        {(isLoading || verbete) && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">Localizando o campo no Layout InvoiCy…</span>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {isError && erroTipado?.tipo === 'nao_encontrado' && (
          <EstadoIndisponivel
            icone={CircleHelp}
            titulo="Este campo não existe no Layout InvoiCy."
            tituloDaAba="Campo do Layout InvoiCy não encontrado"
          >
            <Link
              to="/layout"
              activeOptions={{ exact: true }}
              className="text-sm font-semibold text-primary-medium hover:underline"
            >
              Ver as versões do Layout InvoiCy
            </Link>
          </EstadoIndisponivel>
        )}

        {isError && erroTipado?.tipo === 'campo_despublicado' && (
          <EstadoIndisponivel
            icone={ArchiveX}
            titulo="Este campo saiu do ar."
            tituloDaAba="Campo do Layout InvoiCy fora do ar"
            descricao="O verbete deste campo não está mais disponível publicamente."
          >
            <Link
              to="/layout"
              activeOptions={{ exact: true }}
              className="text-sm font-semibold text-primary-medium hover:underline"
            >
              Ver as versões publicadas
            </Link>
          </EstadoIndisponivel>
        )}

        {isError && !erroTipado && <ErrorState onRetry={() => refetch()} />}
      </main>

      <RodapeContextual contexto={{ tipo: 'layout-campo' }} />
    </div>
  )
}
