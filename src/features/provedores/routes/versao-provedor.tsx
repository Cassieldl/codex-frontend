import { Link } from '@tanstack/react-router'
import { FileX } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { AvisosProvedor } from '../components/AvisosProvedor'
import { AtalhoXmlMontado } from '../components/AtalhoXmlMontado'
import { AvisosVersao } from '../components/AvisosVersao'
import { CamposDaVersao } from '../components/CamposDaVersao'
import { EnvioModeloVersao } from '../components/EnvioModeloVersao'
import { ErrosConhecidos } from '../components/ErrosConhecidos'
import {
  EstadoProvedorIndisponivel,
  type VarianteProvedorIndisponivel,
} from '../components/EstadoProvedorIndisponivel'
import { ExemplosVersao } from '../components/ExemplosVersao'
import { LateralDaAbaErros } from '../components/LateralDaAbaErros'
import { LateralDaNatureza } from '../components/LateralDaNatureza'
import { LateralDoEnvioModelo } from '../components/LateralDoEnvioModelo'
import { NaturezasOperacao } from '../components/NaturezasOperacao'
import { ErroVersaoProvedorHttp, useVersaoProvedor } from '../hooks/useVersaoProvedor'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import { extrairNumeroDaVersao } from '../../../utils/versaoDoLayout'
import type { AvisoPublico } from '../types/provedor'
import { ROTA_DA_ABA } from '../utils/abasDoProvedor'
import type { AbaProvedor } from '../utils/abasDoProvedor'
import { ID_AREA_AVISOS, useRolarParaAreaDeAvisos } from '../utils/avisoAncora'
import { caminhoDoProvedor } from '../utils/caminhoDoProvedor'
import { useCampoDestacadoPorAncora } from '../utils/destaqueAncora'

export interface VersaoProvedorPageProps {
  provedorSlug: string
  versaoSlug: string
  aba: AbaProvedor
  /** Avisos do provedor (não da versão): vêm de P3 e vão para a lateral da aba Erros. */
  avisosDoProvedor: AvisoPublico[]
}

/**
 * Cada tipo que o hook classifica tem destino próprio. Mapa em vez de cadeia de
 * `if`: o tipo que não estiver aqui não some em silêncio no ramo genérico, é a
 * consulta que a guarda estrutural lê para saber que todos foram tratados.
 */
const VARIANTE_POR_TIPO_DE_ERRO: Record<string, VarianteProvedorIndisponivel | undefined> = {
  nao_encontrado: 'versao-nao-encontrada',
  versao_despublicada: 'versao-despublicada',
  provedor_despublicado: 'versao-despublicada',
  limite_excedido: 'versao-grande-demais',
}

interface LinkParaAbaProps {
  provedorSlug: string
  aba: AbaProvedor
  rotulo: string
}

/** Saída do estado vazio de uma aba: leva para outra aba do mesmo provedor. */
function LinkParaAba({ provedorSlug, aba, rotulo }: LinkParaAbaProps) {
  return (
    <Link
      to={ROTA_DA_ABA[aba]}
      params={{ provedorSlug }}
      className="text-sm font-semibold text-primary-medium hover:underline"
    >
      {rotulo}
    </Link>
  )
}

/**
 * Conteúdo de uma aba da página do provedor (Erros, Campos, Natureza da operação ou Envio modelo).
 *
 * Mora aqui, e não no arquivo de rota, pelo mesmo motivo que `provedor-layout`:
 * assim é testável sem a árvore de rotas gerada. Enquanto esteve dentro da
 * rota, ficou sem teste nenhum, e foi onde dois tipos de erro classificados
 * (`nao_encontrado`, `limite_excedido`) passaram a cair no estado genérico sem
 * que nada acusasse.
 */
export function VersaoProvedorPage({
  provedorSlug,
  versaoSlug,
  aba,
  avisosDoProvedor,
}: VersaoProvedorPageProps) {
  const {
    data: versaoPagina,
    isLoading,
    isError,
    error,
    refetch,
  } = useVersaoProvedor(provedorSlug, versaoSlug)
  const campoDestacado = useCampoDestacadoPorAncora()
  // A lateral de avisos só existe na aba Erros, e só depois que o conteúdo chega.
  useRolarParaAreaDeAvisos(aba === 'erros' && versaoPagina !== undefined)

  useTituloDaPagina(!isError && versaoPagina ? versaoPagina.provedor.nome : null)

  if (isLoading) {
    return (
      <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">Carregando o conteúdo do provedor…</span>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError) {
    const erroTipado = error instanceof ErroVersaoProvedorHttp ? error : null
    const variante = VARIANTE_POR_TIPO_DE_ERRO[erroTipado?.tipo ?? '']

    // Só o erro que nenhuma variante cobre (rede, 5xx, não classificado):
    // chega ao `ErrorState`, que é o único caso em que insistir resolve.
    if (!variante) return <ErrorState onRetry={() => refetch()} />

    return <EstadoProvedorIndisponivel variante={variante} />
  }

  if (!versaoPagina) return null

  const urlProvedorAbsoluta =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}${caminhoDoProvedor(provedorSlug)}`

  if (aba === 'erros') {
    return (
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {versaoPagina.errosResumo.itens.length > 0 ? (
          <ErrosConhecidos
            resumo={versaoPagina.errosResumo}
            provedorSlug={provedorSlug}
            camposPorGrupo={versaoPagina.camposPorGrupo}
          />
        ) : (
          <EmptyState
            message="Nenhum erro conhecido para este provedor."
            icon={<FileX className="size-10" />}
            action={<LinkParaAba provedorSlug={provedorSlug} aba="campos" rotulo="Ver os campos" />}
          />
        )}

        <aside
          id={ID_AREA_AVISOS}
          aria-label="Avisos e atalhos"
          className="flex scroll-mt-24 flex-col gap-4"
        >
          <AvisosProvedor nomeProvedor={versaoPagina.provedor.nome} avisos={avisosDoProvedor} />
          <AvisosVersao avisos={versaoPagina.avisos} />
          <LateralDaAbaErros
            provedorSlug={provedorSlug}
            provedorNome={versaoPagina.provedor.nome}
            versaoRotulo={`versão ${extrairNumeroDaVersao(versaoPagina.versao.rotulo)}`}
            camposPorGrupo={versaoPagina.camposPorGrupo}
          />
        </aside>
      </div>
    )
  }

  if (aba === 'campos') {
    return (
      <CamposDaVersao
        provedorNome={versaoPagina.provedor.nome}
        versaoRotulo={versaoPagina.versao.rotulo}
        totalCampos={versaoPagina.totalCampos}
        camposPorGrupo={versaoPagina.camposPorGrupo}
        errosResumo={versaoPagina.errosResumo.itens}
        urlProvedorAbsoluta={urlProvedorAbsoluta}
        campoDestacado={campoDestacado}
        naturezasOperacao={versaoPagina.naturezasOperacao}
        atalhoDoTopo={<AtalhoXmlMontado provedorSlug={provedorSlug} />}
      />
    )
  }

  if (aba === 'natureza') {
    if (versaoPagina.naturezasOperacao.length === 0) {
      return (
        <EmptyState
          message="Veja como este provedor recebe a natureza da operação na aba Campos."
          icon={<FileX className="size-10" />}
          action={<LinkParaAba provedorSlug={provedorSlug} aba="campos" rotulo="Ver os campos" />}
        />
      )
    }

    return (
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <NaturezasOperacao
          naturezas={versaoPagina.naturezasOperacao}
          camposPorGrupo={versaoPagina.camposPorGrupo}
        />
        <aside aria-label="Sobre a conversão" className="flex flex-col gap-4">
          <LateralDaNatureza
            provedorSlug={provedorSlug}
            totalDeCodigos={versaoPagina.naturezasOperacao.length}
            camposPorGrupo={versaoPagina.camposPorGrupo}
          />
        </aside>
      </div>
    )
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-8">
        <EnvioModeloVersao
          key={`${provedorSlug}/${versaoSlug}`}
          provedorSlug={provedorSlug}
          versaoSlug={versaoSlug}
          provedorNome={versaoPagina.provedor.nome}
          versaoRotulo={versaoPagina.versao.rotulo}
          camposPorGrupo={versaoPagina.camposPorGrupo}
        />

        <ExemplosVersao exemplos={versaoPagina.exemplos} provedorSlug={provedorSlug} />
      </div>

      <aside aria-label="Antes de enviar" className="flex flex-col gap-4">
        <LateralDoEnvioModelo
          provedorSlug={provedorSlug}
          totalDeAvisos={avisosDoProvedor.length + versaoPagina.avisos.length}
          codigosDeNatureza={versaoPagina.naturezasOperacao.map(
            (natureza) => natureza.codigoInvoicy,
          )}
          totalDeErros={versaoPagina.errosResumo.total}
        />
      </aside>
    </div>
  )
}
