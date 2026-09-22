import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { AvisosVersao } from '../../../features/provedores/components/AvisosVersao'
import { ErrosConhecidos } from '../../../features/provedores/components/ErrosConhecidos'
import { ExemplosVersao } from '../../../features/provedores/components/ExemplosVersao'
import { TabelaCampos } from '../../../features/provedores/components/TabelaCampos'
import {
  ErroVersaoProvedorHttp,
  useVersaoProvedor,
} from '../../../features/provedores/hooks/useVersaoProvedor'
import { useCampoDestacadoPorAncora } from '../../../features/provedores/utils/destaqueAncora'

export const Route = createFileRoute('/provedores/$provedorSlug/$versaoSlug')({
  component: VersaoProvedorRoute,
})

/** `/provedores/{slug}/{versao}` — conteúdo da aba (§7.6.2-§7.6.4). */
function VersaoProvedorRoute() {
  const { provedorSlug, versaoSlug } = Route.useParams()
  const {
    data: versaoPagina,
    isLoading,
    isError,
    error,
    refetch,
  } = useVersaoProvedor(provedorSlug, versaoSlug)
  const campoDestacado = useCampoDestacadoPorAncora()

  // Chegar por `#campo-…` seleciona a aba certa (já é a própria rota) e
  // rola até a linha — só depois que a tabela terminou de montar.
  useEffect(() => {
    if (!campoDestacado || !versaoPagina) return
    document.getElementById(`campo-${campoDestacado}`)?.scrollIntoView({ block: 'center' })
  }, [campoDestacado, versaoPagina])

  if (isLoading) {
    return (
      <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">Carregando versão…</span>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError) {
    const erroTipado = error instanceof ErroVersaoProvedorHttp ? error : null
    const despublicado =
      erroTipado?.tipo === 'versao_despublicada' || erroTipado?.tipo === 'provedor_despublicado'

    if (despublicado) {
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <h2 className="text-subtitulo font-semibold text-ink">Esta versão saiu do ar.</h2>
          <p className="text-sm text-ink/60">
            O conteúdo desta versão não está mais disponível publicamente.
          </p>
          <Link
            to="/provedores/$provedorSlug"
            params={{ provedorSlug }}
            className="text-sm font-semibold text-primary-medium hover:underline"
          >
            Ver outras versões deste provedor
          </Link>
        </div>
      )
    }

    return <ErrorState onRetry={() => refetch()} />
  }

  if (!versaoPagina) return null

  const urlVersaoAbsoluta =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/provedores/${provedorSlug}/${versaoSlug}`

  return (
    <div className="flex flex-col gap-8">
      {versaoPagina.versao.introducao && (
        <p className="text-sm text-ink/80">{versaoPagina.versao.introducao}</p>
      )}

      <p className="text-xs text-ink/50">
        Escrita contra o Layout InvoiCy {versaoPagina.versao.versaoLayoutRotulo}.
      </p>

      <AvisosVersao avisos={versaoPagina.avisos} />

      <TabelaCampos
        provedorNome={versaoPagina.provedor.nome}
        versaoRotulo={versaoPagina.versao.rotulo}
        verificadoEm={versaoPagina.versao.verificadoEm}
        totalCampos={versaoPagina.totalCampos}
        camposPorGrupo={versaoPagina.camposPorGrupo}
        urlVersaoAbsoluta={urlVersaoAbsoluta}
        campoDestacado={campoDestacado}
      />

      <ErrosConhecidos resumo={versaoPagina.errosResumo} provedorSlug={provedorSlug} />

      <ExemplosVersao
        exemplos={versaoPagina.exemplos}
        provedorSlug={provedorSlug}
        versaoSlug={versaoSlug}
      />
    </div>
  )
}
