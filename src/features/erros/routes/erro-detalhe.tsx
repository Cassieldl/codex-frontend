import { isAxiosError } from 'axios'
import { useEffect } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { corrigirUrlCanonica, type NavegacaoCanonica } from '../../../utils/corrigirUrlCanonica'
import { handleApiError } from '../../../utils/handleApiError'
import { ArtigosRelacionados } from '../components/ArtigosRelacionados'
import { BlocoMensagensObservadas } from '../components/BlocoMensagensObservadas'
import { CamposRelacionados } from '../components/CamposRelacionados'
import { ErroSemVersaoAplicavel } from '../components/ErroSemVersaoAplicavel'
import { EstadoErroIndisponivel } from '../components/EstadoErroIndisponivel'
import { useErroPorSlug } from '../hooks/useErroPorSlug'
import type { OrigemErro } from '../types/erro'

export interface ErroDetalhePageProps {
  erroSlug: string
  /**
   * Caminho em que a página está sendo servida (`/erros/{slug}`) — injetado
   * pela rota fina. É o que se compara com `/erros/{erro.slug}` para decidir
   * o redirecionamento (F-4/`arquitetura.md` §5.F).
   */
  caminhoAtual: string
  navegar: (opcoes: NavegacaoCanonica) => void
}

const ORIGEM_ROTULO: Record<OrigemErro, string> = {
  Prefeitura: 'Prefeitura',
  InvoiCy: 'InvoiCy',
  Schema: 'Schema/XML',
}

/**
 * `/erros/{erroSlug}` — tela 3, a página que o suporte cola no chamado
 * (§7.2). `404`/`410` são tratados aqui, distintos (M7) — nunca colapsados
 * em "não encontrado".
 */
export function ErroDetalhePage({ erroSlug, caminhoAtual, navegar }: ErroDetalhePageProps) {
  const { data: erro, isLoading, isError, error, refetch } = useErroPorSlug(erroSlug)

  const status = isAxiosError(error) ? error.response?.status : undefined
  const mensagemErro = isAxiosError(error) ? handleApiError(error) : undefined

  // F-4 (`arquitetura.md` §5.F) — `erro` nunca teve mecanismo de correção de
  // slug, nem certo nem morto. `erro.slug` é o canônico; se divergir do
  // caminho atual, a página redireciona antes de renderizar o conteúdo —
  // mesmo mecanismo de `artigo-detalhe.tsx`/`route.tsx` de provedor.
  const caminhoCanonico = erro ? `/erros/${erro.slug}` : null
  const correcao = caminhoCanonico ? corrigirUrlCanonica(caminhoAtual, caminhoCanonico) : null

  useEffect(() => {
    if (correcao) navegar(correcao)
  }, [correcao, navegar])

  // Contexto único de provedor/versão (M10 + rodapé §8): só existe quando o
  // erro aplica a exatamente UMA versão de provedor — com zero (erro geral,
  // U9) ou mais de uma, não há um alvo inequívoco para linkar/recomendar.
  const contextoUnico =
    erro && erro.versoesAplicaveis.length === 1
      ? {
          provedorSlug: erro.versoesAplicaveis[0]!.provedorSlug,
          versaoSlug: erro.versoesAplicaveis[0]!.versaoSlug,
        }
      : null

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8 lg:px-8">
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
            <header className="flex flex-col gap-2 border-b border-line pb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-mono text-titulo font-bold text-ink">{erro.codigo}</h1>
                <BotaoCopiar
                  valor={() => window.location.href}
                  ariaLabel={`Copiar link do erro ${erro.codigo}`}
                  rotulo="Copiar link"
                />
              </div>
              <p className="text-sm text-ink/60">Origem: {ORIGEM_ROTULO[erro.origem]}</p>
              <p className="text-card-titulo font-medium text-ink">{erro.titulo}</p>
            </header>

            <BlocoMensagensObservadas variantes={erro.variantes} codigoErro={erro.codigo} />

            <section aria-labelledby="causa-provavel-titulo" className="flex flex-col gap-2">
              <h2 id="causa-provavel-titulo" className="text-subtitulo font-semibold text-ink">
                Causa provável
              </h2>
              <p className="text-sm text-ink/80">
                {erro.causaProvavel ?? 'Causa provável ainda não documentada.'}
              </p>
            </section>

            {erro.solucaoSugerida && (
              <section
                aria-labelledby="solucao-sugerida-titulo"
                className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-primary-light bg-surface-hover p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="solucao-sugerida-titulo" className="text-titulo font-bold text-ink">
                    Solução sugerida
                  </h2>
                  <BotaoCopiar
                    valor={erro.solucaoSugerida}
                    ariaLabel="Copiar solução sugerida como texto"
                    rotulo="Copiar como texto"
                  />
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink">{erro.solucaoSugerida}</p>
              </section>
            )}

            <ErroSemVersaoAplicavel versoesAplicaveis={erro.versoesAplicaveis} />

            <CamposRelacionados campos={erro.camposRelacionados} contexto={contextoUnico} />

            <ArtigosRelacionados artigos={erro.artigosRelacionados} />
          </>
        )}
      </main>

      <RodapeContextual
        contexto={
          contextoUnico
            ? {
                tipo: 'erro-com-contexto',
                provedorSlug: contextoUnico.provedorSlug,
                versaoSlug: contextoUnico.versaoSlug,
              }
            : { tipo: 'erro-sem-contexto' }
        }
      />
    </div>
  )
}
