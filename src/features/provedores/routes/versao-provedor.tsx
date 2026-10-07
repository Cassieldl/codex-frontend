import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { AvisosVersao } from '../components/AvisosVersao'
import { ErrosConhecidos } from '../components/ErrosConhecidos'
import {
  EstadoProvedorIndisponivel,
  type VarianteProvedorIndisponivel,
} from '../components/EstadoProvedorIndisponivel'
import { ExemplosVersao } from '../components/ExemplosVersao'
import { TabelaCampos } from '../components/TabelaCampos'
import { ErroVersaoProvedorHttp, useVersaoProvedor } from '../hooks/useVersaoProvedor'
import { useCampoDestacadoPorAncora } from '../utils/destaqueAncora'

export interface VersaoProvedorPageProps {
  provedorSlug: string
  versaoSlug: string
}

/**
 * Cada tipo que o hook classifica tem destino próprio. Mapa em vez de cadeia de
 * `if`: o tipo que não estiver aqui não some em silêncio no ramo genérico — é a
 * consulta que a guarda estrutural lê para saber que todos foram tratados.
 */
const VARIANTE_POR_TIPO_DE_ERRO: Record<string, VarianteProvedorIndisponivel | undefined> = {
  nao_encontrado: 'versao-nao-encontrada',
  versao_despublicada: 'versao-despublicada',
  provedor_despublicado: 'versao-despublicada',
  limite_excedido: 'versao-grande-demais',
}

/**
 * `/provedores/{slug}/{versao}` — conteúdo da aba (§7.6.2-§7.6.4).
 *
 * Mora aqui, e não no arquivo de rota, pelo mesmo motivo que `provedor-layout`:
 * assim é testável sem a árvore de rotas gerada. Enquanto esteve dentro da
 * rota, ficou sem teste nenhum — e foi onde dois tipos de erro classificados
 * (`nao_encontrado`, `limite_excedido`) passaram a cair no estado genérico sem
 * que nada acusasse.
 */
export function VersaoProvedorPage({ provedorSlug, versaoSlug }: VersaoProvedorPageProps) {
  const {
    data: versaoPagina,
    isLoading,
    isError,
    error,
    refetch,
  } = useVersaoProvedor(provedorSlug, versaoSlug)
  const campoDestacado = useCampoDestacadoPorAncora()

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
    const variante = VARIANTE_POR_TIPO_DE_ERRO[erroTipado?.tipo ?? '']

    // Só o erro que nenhuma variante cobre — rede, 5xx, não classificado —
    // chega ao `ErrorState`, que é o único caso em que insistir resolve.
    if (!variante) return <ErrorState onRetry={() => refetch()} />

    return <EstadoProvedorIndisponivel variante={variante} provedorSlug={provedorSlug} />
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

      <p className="text-xs text-muted">
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
