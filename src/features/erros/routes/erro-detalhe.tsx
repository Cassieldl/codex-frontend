import { Link } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useEffect } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import type { ContextoRodape } from '../../../components/layout/RodapeContextual'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import { corrigirUrlCanonica, type NavegacaoCanonica } from '../../../utils/corrigirUrlCanonica'
import { handleApiError } from '../../../utils/handleApiError'
import { montarLinkSuporte, ROTULO_FALAR_COM_SUPORTE } from '../../../utils/linkSuporte'
import { ComunicadosDoContexto } from '../../comunicados/components/ComunicadosDoContexto'
import { ArtigosRelacionados } from '../components/ArtigosRelacionados'
import { BlocoMensagensObservadas } from '../components/BlocoMensagensObservadas'
import { CamposRelacionados } from '../components/CamposRelacionados'
import { ErroSemVersaoAplicavel } from '../components/ErroSemVersaoAplicavel'
import { EstadoErroIndisponivel } from '../components/EstadoErroIndisponivel'
import { useErroPorSlug } from '../hooks/useErroPorSlug'
import type { ErroDetalhe, OrigemErro, VersaoAplicavel } from '../types/erro'
import { resolverMensagemDoErro } from '../utils/mensagemDoErro'

export interface ErroDetalhePageProps {
  erroSlug: string
  /**
   * Caminho em que a página está sendo servida (`/erros/{slug}`), injetado pela rota fina. É o
   * que se compara com `/erros/{erro.slug}` para decidir o redirecionamento (F-4).
   */
  caminhoAtual: string
  navegar: (opcoes: NavegacaoCanonica) => void
}

const ORIGEM_ROTULO: Record<OrigemErro, string> = {
  Prefeitura: 'Prefeitura',
  InvoiCy: 'InvoiCy',
  Schema: 'Schema/XML',
}

const CLASSE_DO_CHIP =
  'inline-flex items-center rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs font-semibold'

/**
 * Rodapé por natureza do erro (§7.1): um provedor, nenhum (geral) ou vários. Sem erro carregado
 * (carregando, falha, 404/410) não há próximo passo a oferecer.
 */
function montarContextoRodape(
  erro: ErroDetalhe | undefined,
  versaoUnica: VersaoAplicavel | null,
): ContextoRodape {
  if (!erro) return { tipo: 'erro-sem-contexto' }
  if (versaoUnica) {
    return {
      tipo: 'erro-com-contexto',
      provedorSlug: versaoUnica.provedorSlug,
      codigoErro: erro.codigo,
      temCampoRelacionado: erro.camposRelacionados.length > 0,
    }
  }
  if (erro.versoesAplicaveis.length === 0) return { tipo: 'erro-geral', codigoErro: erro.codigo }

  return { tipo: 'erro-varios-provedores', codigoErro: erro.codigo }
}

interface CabecalhoDoErroProps {
  erro: ErroDetalhe
  versaoUnica: VersaoAplicavel | null
}

function CabecalhoDoErro({ erro, versaoUnica }: CabecalhoDoErroProps) {
  const mensagem = resolverMensagemDoErro(erro).principal

  return (
    <header className="flex flex-col gap-3 border-b border-border pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-titulo font-bold text-ink">{erro.codigo}</h1>
        <BotaoCopiar
          compacto
          icone="link"
          valor={() => window.location.href}
          ariaLabel={`Copiar link do erro ${erro.codigo}`}
          rotulo="Copiar link"
        />
      </div>

      <ul aria-label="Contexto do erro" className="flex flex-wrap items-center gap-2">
        <li className={`${CLASSE_DO_CHIP} border-border bg-white text-ink`}>
          Origem: {ORIGEM_ROTULO[erro.origem]}
        </li>
        {versaoUnica && (
          <li>
            <Link
              to="/provedores/$provedorSlug"
              params={{ provedorSlug: versaoUnica.provedorSlug }}
              className={`${CLASSE_DO_CHIP} border-primary-light bg-white text-primary-medium hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover`}
            >
              {versaoUnica.provedorNome} {versaoUnica.versaoRotulo}
            </Link>
          </li>
        )}
      </ul>

      <div className="flex items-start justify-between gap-3">
        <p className="text-card-titulo font-medium text-ink">{mensagem}</p>
        <BotaoCopiar
          valor={mensagem}
          ariaLabel={`Copiar a mensagem do erro ${erro.codigo}`}
          rotulo="Copiar"
          className="shrink-0"
        />
      </div>
    </header>
  )
}

function SolucaoDoErro({ solucao }: { solucao: string }) {
  return (
    <section
      aria-labelledby="solucao-sugerida-titulo"
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-primary-light bg-white p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="solucao-sugerida-titulo" className="text-subtitulo font-semibold text-ink">
          Solução sugerida
        </h2>
        <BotaoCopiar
          valor={solucao}
          ariaLabel="Copiar solução sugerida como texto"
          rotulo="Copiar como texto"
        />
      </div>
      <p className="whitespace-pre-wrap text-sm text-ink">{solucao}</p>
    </section>
  )
}

/** Sem solução publicada, o leitor recebe o caminho para o suporte no lugar da seção. */
function AjudaDoSuporte({ codigo }: { codigo: string }) {
  const link = montarLinkSuporte(
    `Codex · erro ${codigo}`,
    `Código do erro: ${codigo}
Página: ${window.location.href}`,
  )

  return (
    <p className="text-sm text-ink">
      Precisa de ajuda com este erro?{' '}
      <a href={link} className="font-semibold text-primary-medium hover:underline">
        {ROTULO_FALAR_COM_SUPORTE}
      </a>
    </p>
  )
}

/**
 * `/erros/{erroSlug}`, a página que o suporte cola no chamado (§7.2). A ordem segue o que decide
 * o caso: código, contexto (origem e provedor), a mensagem uma vez e logo a solução. Seção sem
 * conteúdo não aparece. `404`/`410` são tratados aqui, distintos (M7).
 */
export function ErroDetalhePage({ erroSlug, caminhoAtual, navegar }: ErroDetalhePageProps) {
  const { data: erro, isLoading, isError, error, refetch } = useErroPorSlug(erroSlug)

  const status = isAxiosError(error) ? error.response?.status : undefined
  const mensagemErro = isAxiosError(error) ? handleApiError(error) : undefined

  // `erro.slug` é o canônico; se divergir do caminho atual, a página redireciona antes de
  // renderizar o conteúdo (F-4).
  const caminhoCanonico = erro ? `/erros/${erro.slug}` : null
  const correcao = caminhoCanonico ? corrigirUrlCanonica(caminhoAtual, caminhoCanonico) : null

  useEffect(() => {
    if (correcao) navegar(correcao)
  }, [correcao, navegar])

  useTituloDaPagina(!isError && erro ? `${erro.codigo}: ${erro.titulo}` : null)

  // Contexto único (M10 e rodapé §8): só quando o erro vale para exatamente UMA versão de
  // provedor. Com zero (erro geral, U9) ou mais, não há alvo inequívoco.
  const versaoUnica = erro && erro.versoesAplicaveis.length === 1 ? erro.versoesAplicaveis[0] : null

  return (
    <div className="flex min-h-screen flex-col bg-surface-hover">
      <CabecalhoPublico />

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-pagina flex-1 flex-col gap-8 px-4 py-8 lg:px-8"
      >
        {(isLoading || correcao) && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">
              {correcao ? 'Abrindo o endereço oficial do erro…' : 'Carregando o erro…'}
            </span>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {isError && status === 404 && (
          <EstadoErroIndisponivel variante="nao-encontrado" slugTentado={erroSlug} />
        )}

        {isError && status === 410 && (
          <EstadoErroIndisponivel
            variante="despublicado"
            slugTentado={erroSlug}
            motivo={mensagemErro}
          />
        )}

        {isError && status !== 404 && status !== 410 && (
          <ErrorState message={mensagemErro} onRetry={() => refetch()} />
        )}

        {!isLoading && !isError && erro && !correcao && (
          <>
            <CabecalhoDoErro erro={erro} versaoUnica={versaoUnica} />

            {erro.solucaoSugerida ? (
              <SolucaoDoErro solucao={erro.solucaoSugerida} />
            ) : (
              <AjudaDoSuporte codigo={erro.codigo} />
            )}

            <ComunicadosDoContexto
              provedorSlugs={erro.versoesAplicaveis.map((versao) => versao.provedorSlug)}
              versaoSlug={versaoUnica?.versaoSlug}
            />

            {erro.causaProvavel && (
              <section aria-labelledby="causa-provavel-titulo" className="flex flex-col gap-2">
                <h2 id="causa-provavel-titulo" className="text-subtitulo font-semibold text-ink">
                  Causa provável
                </h2>
                {/* A causa chega em linhas: a regra da Sefin e, em seguida, onde ela se aplica. */}
                <p className="max-w-[100ch] whitespace-pre-line text-sm text-ink">
                  {erro.causaProvavel}
                </p>
              </section>
            )}

            <BlocoMensagensObservadas
              variantes={erro.variantes}
              codigoErro={erro.codigo}
              titulo={erro.titulo}
            />

            <ErroSemVersaoAplicavel versoesAplicaveis={erro.versoesAplicaveis} />

            <CamposRelacionados
              campos={erro.camposRelacionados}
              contexto={versaoUnica ? { provedorSlug: versaoUnica.provedorSlug } : null}
            />

            <ArtigosRelacionados artigos={erro.artigosRelacionados} />
          </>
        )}
      </main>

      <RodapeContextual contexto={montarContextoRodape(erro, versaoUnica)} />
    </div>
  )
}
