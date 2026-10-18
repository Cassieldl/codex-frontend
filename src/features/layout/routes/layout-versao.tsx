import { Link } from '@tanstack/react-router'
import { ArchiveX, CircleHelp, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { ErrorState } from '../../../components/ui/ErrorState'
import { EstadoIndisponivel } from '../../../components/ui/EstadoIndisponivel'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import { useCampoDestacadoPorAncora } from '../../provedores/utils/destaqueAncora'
import { AvisoVocabulario } from '../components/AvisoVocabulario'
import { ChipVersaoLayout } from '../components/ChipVersaoLayout'
import { DicionarioDaVersao } from '../components/DicionarioDaVersao'
import { HistoricoVersoesLayout } from '../components/HistoricoVersoesLayout'
import { useLayoutIndice } from '../hooks/useLayoutIndice'
import { ErroLayoutVersaoHttp, useLayoutVersao } from '../hooks/useLayoutVersao'
import type { TipoErroLayoutVersao } from '../hooks/useLayoutVersao'
import { LEGENDA_ESTADO_VERSAO } from '../utils/estadoVersaoLayout'

export interface LayoutVersaoPageProps {
  versaoSlug: string
}

const ESTADO_POR_TIPO_DE_ERRO: Record<
  TipoErroLayoutVersao,
  { icone: LucideIcon; titulo: string; tituloDaAba: string; descricao: string }
> = {
  nao_encontrada: {
    icone: CircleHelp,
    titulo: 'Esta versão do Layout InvoiCy não existe.',
    tituloDaAba: 'Versão do Layout InvoiCy não encontrada',
    descricao: 'Não encontramos nenhuma versão publicada do Layout InvoiCy neste endereço.',
  },
  despublicada: {
    icone: ArchiveX,
    titulo: 'Esta versão saiu do ar.',
    tituloDaAba: 'Versão do Layout InvoiCy fora do ar',
    descricao: 'O dicionário desta versão não está mais disponível publicamente.',
  },
  cap_excedido: {
    icone: Layers,
    titulo: 'Esta versão tem mais campos do que esta página consegue exibir de uma vez.',
    tituloDaAba: 'Versão do Layout InvoiCy grande demais para exibir',
    descricao: 'Fale com o suporte.',
  },
}

/**
 * `/layout/{versaoSlug}` (tela 6) — o dicionário denso de uma versão do Layout
 * InvoiCy. O índice de versões (P10) é consultado à parte só para o seletor e
 * para o histórico: se ele falhar, o dicionário continua de pé — a falha do
 * acessório nunca derruba o conteúdo principal.
 */
export function LayoutVersaoPage({ versaoSlug }: LayoutVersaoPageProps) {
  const { data: pagina, isLoading, isError, error, refetch } = useLayoutVersao(versaoSlug)
  const { data: indice } = useLayoutIndice()
  const campoDestacado = useCampoDestacadoPorAncora()

  const camposNovos = useMemo(
    () =>
      (pagina?.camposPorGrupo ?? []).reduce(
        (soma, grupo) => soma + grupo.campos.filter((campo) => campo.novoNestaVersao).length,
        0,
      ),
    [pagina],
  )

  const erroTipado = error instanceof ErroLayoutVersaoHttp ? error : null
  const origemUrl = typeof window === 'undefined' ? '' : window.location.origin

  useTituloDaPagina(pagina ? `Layout InvoiCy ${formatarVersaoLayout(pagina.versao.rotulo)}` : null)

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 lg:px-8"
      >
        {isLoading && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">Carregando o dicionário de campos…</span>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {/* Limite estrutural (`cap_excedido`) também cai aqui, e não no ErrorState: oferecer
            "tentar novamente" seria mandar o leitor repetir algo que nunca vai dar certo. */}
        {isError && erroTipado && (
          <EstadoIndisponivel {...ESTADO_POR_TIPO_DE_ERRO[erroTipado.tipo]}>
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

        {!isLoading && !isError && pagina && (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted">
                <Link to="/layout" activeOptions={{ exact: true }} className="hover:underline">
                  Layout InvoiCy
                </Link>{' '}
                / {formatarVersaoLayout(pagina.versao.rotulo, { maiuscula: true })}
              </p>
              <h1 className="text-titulo font-bold text-ink">
                Layout InvoiCy {formatarVersaoLayout(pagina.versao.rotulo)}
              </h1>
              <p className="text-sm text-ink/70">
                {pagina.versao.estado} · {pagina.totalCampos} campos no vocabulário
                {camposNovos > 0 && ` · ${camposNovos} novos nesta versão`}
              </p>
            </div>

            <AvisoVocabulario />

            {indice && indice.versoes.length > 0 && (
              <section aria-labelledby="seletor-versao-titulo" className="flex flex-col gap-3">
                <h2 id="seletor-versao-titulo" className="text-card-titulo font-medium text-ink">
                  Versão do layout — escolha para ver o dicionário
                </h2>
                <ul className="flex flex-wrap gap-3">
                  {indice.versoes.map((versao) => (
                    <li key={versao.slug}>
                      <ChipVersaoLayout versao={versao} ativa={versao.slug === versaoSlug} />
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted">{LEGENDA_ESTADO_VERSAO}</p>
              </section>
            )}

            {pagina.descricao && (
              <section aria-labelledby="nota-versao-titulo" className="flex flex-col gap-2">
                <h2 id="nota-versao-titulo" className="text-subtitulo font-semibold text-ink">
                  Nota da {formatarVersaoLayout(pagina.versao.rotulo)}
                </h2>
                <p className="max-w-prose text-sm text-ink/80">{pagina.descricao}</p>
              </section>
            )}

            {pagina.anterior && (
              <p className="text-sm text-ink/70">
                Versão anterior:{' '}
                <Link
                  to="/layout/$versaoSlug"
                  params={{ versaoSlug: pagina.anterior.slug }}
                  activeOptions={{ exact: true }}
                  className="font-semibold text-primary-medium hover:underline"
                >
                  ver o dicionário da {formatarVersaoLayout(pagina.anterior.rotulo)}
                </Link>{' '}
                para comparar o vocabulário.
              </p>
            )}

            <DicionarioDaVersao
              versaoRotulo={pagina.versao.rotulo}
              totalCampos={pagina.totalCampos}
              camposPorGrupo={pagina.camposPorGrupo}
              origemUrl={origemUrl}
              campoDestacado={campoDestacado}
            />

            {indice && (
              <HistoricoVersoesLayout versoes={indice.versoes} versaoAtualSlug={versaoSlug} />
            )}
          </>
        )}
      </main>

      <RodapeContextual contexto={{ tipo: 'layout' }} />
    </div>
  )
}
